import { Result } from 'derlib/config/result';
import { startPersistence } from 'derlib/persistence';
import { ConfigurationPersistence } from 'derlib/config/persistence';
import { ConfigurationParser } from 'derlib/config/parser';
import { Handouts, HandoutsOptions } from 'derlib/roll20/handouts';
import { ConfigurationCommand } from 'derlib/config/atoms';
import { Options } from 'derlib/roll20/options';
import { Der20Dialog } from './dialog';
import { DefaultConstructed } from '../utility';

// from our module header
declare var console: any;

// from Roll20
// REVISIT use derlib/rol20/api.d.ts
// REVISIT support mock20?
declare function log(message: any): void;
declare function on(event: 'ready', callback: () => void): void;
declare function on(event: 'chat:message', callback: (msg: any) => void): void;
declare function getObj(type: 'player', id: string);
declare function sendChat(speakingAs: string, message: string, callback?: (operations: any[]) => void, options?: any): void;

class Plugin<T> {
    configurationRoot: any;
    persistence: ConfigurationPersistence;
    handouts: Handouts;

    constructor(public name: string, public factory: DefaultConstructed<T>) {
        // generated code 

        // create the world
        this.reset();
    }
    
    reset() {
        // create the world
        this.configurationRoot = new (this.factory)();

        // add debug commmand
        if (this.configurationRoot.dump === undefined) {
            this.configurationRoot.dump = new DumpCommand();     
        }

        // add reset command
        if (this.configurationRoot.reset === undefined) {
            this.configurationRoot.reset = new ResetCommand();
        }
    }

    start() {
        // start up on ready event
        this.persistence = startPersistence(this.name);
        this.restoreConfiguration();
        this.hookChatMessage();
        this.hookReady();       
    }

    restoreConfiguration() {
        let json = this.persistence.load();
        ConfigurationParser.restore(json, this.configurationRoot);
    }

    handleResult(player: any, command: string, result: Result.Any): Result.Any {
        if (result.events.has(Result.Event.Change)) {
            this.saveConfiguration();
        }

        // XXX send any messages to caller, regardless of result

        // this switch must be exhaustive
        // tslint:disable-next-line:switch-default
        switch (result.kind) {
            case Result.Kind.Failure:
                for (let error of (<Result.Failure>result).errors) {
                    this.reportError(error);
                }
                return result;
            case Result.Kind.Dialog:
                let dialogResult = <Result.Dialog>result;
                let dialog = dialogResult.dialog.replace(new RegExp(ConfigurationParser.MAGIC_COMMAND_STRING, 'g'), command);
                console.log(`dialog from parse: ${dialog.substr(0, 16)}...`);
                switch (dialogResult.destination) {
                    case Result.Dialog.Destination.All:
                    case Result.Dialog.Destination.AllPlayers:
                        sendChat(this.name, `${dialog}`, null);
                        break;
                    case Result.Dialog.Destination.Caller:
                        sendChat(this.name, `/w "${player.get('displayname')}" ${dialog}`, null, { noarchive: true });
                        break;
                    default:
                        sendChat(this.name, `/w GM ${dialog}`, null, { noarchive: true });
                }
                return new Result.Success();
            case Result.Kind.Success:
                if (command.endsWith('-show')) {
                    // execute show action after executing command, used in interactive dialogs to
                    // render the new state of the dialog
                    let showResult = this.configurationRoot.show.parse('');
                    return this.handleResult(player, '', showResult);
                }
                return result;
        }
    }

    saveConfiguration() {
        let text = JSON.stringify(this.configurationRoot);
        // now that everything is clean, convert back to a dictionary
        let cleaned = JSON.parse(text);
        this.persistence.save(cleaned);
    }

    reportError(error: Error) {
        console.log(`error from parse: ${error.message}`);
        sendChat(this.name, `/w GM ${error.message}`, null, { noarchive: true });
    }

    // detect journal reading config in well known location 'config handouts ...'
    configureHandoutsSupport() {
        if (!this.configurationRoot.hasOwnProperty(Options.pluginOptionsKey)) {
            console.log(`this plugin does not have plugin configuration under '${Options.pluginOptionsKey}'`);
            return;
        }
        const pluginOptions = this.configurationRoot[Options.pluginOptionsKey];
        if (!pluginOptions.hasOwnProperty('handouts')) {
            console.log(`this plugin does not support handout options under 'config handouts'`);
            return;
        }
        const handoutsOptions: any = pluginOptions.handouts;
        if (!(handoutsOptions instanceof HandoutsOptions)) {
            console.log(`this plugin uses non-standard options under 'config handouts' that are unsupported`);
            return;
        }
        this.handouts = new Handouts(this.name, this.configurationRoot, handoutsOptions);
    }

    hookChatMessage() {
        on('chat:message', msg => {
            if (msg.type !== 'api') {
                return;
            }
            try {
                let player = getObj('player', msg.playerid);
                let lines = msg.content.split('\n');
                let validCommands = new Set([`!${this.name}`, `!${this.name}-show`]);
                for (let line of lines) {
                    let tokens = ConfigurationParser.tokenizeFirst(line);
                    if (!validCommands.has(tokens[0])) {
                        // console.log(`ignoring command for other plugin: ${line}`);
                        continue;
                    }
                    let result = ConfigurationParser.parse(tokens[1], this.configurationRoot);
                    result = this.handleResult(player, tokens[0], result);
                    if (result.kind === Result.Kind.Failure) {
                        // REVISIT should we stop processing lines in this block?
                    }
                }
            } catch (error) {
                this.reportError(error);
            }
        });
    }

    hookReady() {
        on('ready', function() {
            // need to wait for handouts to load, so we do this on ready
            plugin.configureHandoutsSupport();

            // XXX not finished loading, handout reading is async, so we need to check if either sheet worker idle is sufficient or add a semaphore
            console.log('loaded');
        });
    }
}

var plugin;

export function start<T>(pluginName: string, factory: DefaultConstructed<T>) {
    if (typeof log !== 'function') {
        throw new Error('this script includes a module that can only be run in the actual Roll20 environment; please create a separate test script');
    }
    
    console.log = message => {
        let stamp = new Date().toISOString();
        log(`${stamp} ${pluginName || 'der20'}: ${message}`);
    };
    // singleton, make sure this is set before we do any work on start up
    plugin = new Plugin(pluginName, factory);
    plugin.start();
}

export class DumpCommand extends ConfigurationCommand {
    parse(line: string): Result.Any {
        let dialog = new Der20Dialog(`${ConfigurationParser.MAGIC_COMMAND_STRING} `);
        dialog.beginControlGroup();
        dialog.addTextLine(JSON.stringify(plugin.configurationRoot));
        dialog.endControlGroup();
        return new Result.Dialog(Result.Dialog.Destination.Caller, dialog.render());
    }
}

export class ResetCommand extends ConfigurationCommand {
    parse(line: string): Result.Any {
        if (line !== 'all configuration') {
            return new Result.Failure(new Error(`reset command must match 'reset all configuration' exactly`));
        }
        plugin.reset();
        plugin.saveConfiguration();
        return new Result.Success();
    }
}
