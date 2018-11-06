import { Result } from 'derlib/config/result';
import { startPersistence } from 'derlib/persistence';
import { ConfigurationPersistence } from 'derlib/config/persistence';
import { ConfigurationParser, ConfigurationUpdate } from 'derlib/config/parser';
import { ConfigurationCommand } from 'derlib/config/atoms';
import { Der20Dialog } from './dialog';
import { DefaultConstructed } from 'derlib/utility';
import { ConfigurationLoader } from 'derlib/config/loader';
import { ConfigurationSource,  ConfigurationContext, LoaderContext, ParserContext } from 'derlib/config/context';
import { PromiseQueue } from 'derlib/promise';
import { HelpCommand, common } from 'derlib/config/help';
import { Options } from './options';

// from Roll20, missing in types file 
declare function playerIsGM(playerid: string): boolean;

// from our wrapper
declare var der20Mode: string | undefined;

// if we add more events, we need to repeat declaration overrides here:
// declare function on(event: "chat:message", callback: (msg: ChatEventData) => void): void;
// declare function on(event: "ready", callback: () => void): void;

class Plugin<T> {
    configurationRoot: any;
    persistence: ConfigurationPersistence;
    work: PromiseQueue = new PromiseQueue();
    verbose: boolean = false;

    // REVISIT: the reason there are so many levels is because we don't have explicit dependencies 
    // between work items.  Because config work is concurrent, there could be several currently running
    // configuration work items (or existing Promises being tracked,) and waiting for them to complete
    // requires scheduling at a lower (NOTE: lower priority is numerically larger) level.  Scheduling at 
    // the same level does not enforce ordering, because concurrency is set > 1.
    levels: {
        // async value reads required to retry things
        fetches: PromiseQueue.Level;

        // retries of commands or config that required fetches
        retries: PromiseQueue.Level;

        // configuration reading
        config: PromiseQueue.Level;

        // commands from configuration being parsed, 1 at a time to preserve order
        configparse: PromiseQueue.Level;

        // configuration check, after all reading is done but before any commands are executed
        // NOTE: this level is used to schedule more config work as follow-ups when previous config work is done
        followups: PromiseQueue.Level;

        // API commands
        commands: PromiseQueue.Level;
    } = { fetches: undefined, retries: undefined, config: undefined, configparse: undefined, followups: undefined, commands: undefined };

    // all '!' commands supported by this plugin
    private commands: Set<string> = new Set();
    
    constructor(public name: string, public factory: DefaultConstructed<T>) {
        // generated code

        // uncomment the following line to enable debug logging
        // debug.log = console.log;
        // REVISIT make this a plugin option that is always supported, and parse ahead for it in the json during restoreConfiguration

        // Configure work priorities, from most urgent to least urgent.  WARNING: do not set concurrency on the commands level to 
        // anything greater than 1,because ordering matters at that level.
        this.levels.fetches = this.work.createPriorityLevel({ concurrency: 16, name: 'asynchronous reads' });
        this.levels.retries = this.work.createPriorityLevel({ concurrency: 1, name: 'command retries' });
        this.levels.config = this.work.createPriorityLevel({ concurrency: 16, name: 'configuration' });
        this.levels.configparse = this.work.createPriorityLevel({ concurrency: 1, name: 'configuration parsing' });
        this.levels.followups = this.work.createPriorityLevel({ concurrency: 1, name: 'configuration follow up' });
        this.levels.commands = this.work.createPriorityLevel({ concurrency: 1, name: 'commands' });

        // initialization code shared with reset command
        this.reset();
    }

    reset() {
        // create the world
        this.configurationRoot = new this.factory();

        // add debug commmand
        if (this.configurationRoot.dump === undefined) {
            this.configurationRoot.dump = new DumpCommand();
            common('PLUGIN')(this.configurationRoot.constructor.prototype, 'dump');
        }

        // add reset command
        if (this.configurationRoot.reset === undefined) {
            this.configurationRoot.reset = new ResetCommand();
            common('PLUGIN')(this.configurationRoot.constructor.prototype, 'reset');
        }

        // add help command
        if (this.configurationRoot.help === undefined) {
            this.configurationRoot.help = new HelpCommand(this.configurationRoot);
            common('PLUGIN')(this.configurationRoot.constructor.prototype, 'help');
        }
    }

    start() {
        if (der20Mode === 'help generator') {
            // help generator mode is called from build system to emit command list as JSON
            let help = new HelpCommand(this.configurationRoot);
            process.stdout.write(JSON.stringify(help.generated()).replace(new RegExp(ConfigurationParser.MAGIC_PLUGIN_STRING, 'g'), `${this.name}`));
            return;
        }

        // start up on ready event
        this.hookReady();
    }

    restoreConfiguration() {
        let json = this.persistence.load();
        let context = new PluginLoaderContext();

        // we don't use the indirect result based approach we use for parsing,
        // because named promises do not work for loading.  parsing is only considering one path to root at
        // a time, so it is different than loading the entire tree
        ConfigurationLoader.restore(json, this.configurationRoot, context);

        // add support for optional command strings
        this.registerCommonOptions();
     
        // potentially schedule some commands
        this.handleLoaderResults(context);   
    }

    private registerCommonOptions() {
        // built in top-level commands for this plugin
        let builtinCommands = [`!${this.name}`];
        if (this.configurationRoot.show !== undefined) {
            builtinCommands.push(`!${this.name}-show`);
        } 
        
        if (this.configurationRoot[Options.pluginOptionsKey] === undefined) {
            // options not supported, so we use fixed configuration
            this.commands = new Set(builtinCommands);
            return;
        }

        let options = <Options>this.configurationRoot[Options.pluginOptionsKey];
        debug.log(`plugin has common options: ${JSON.stringify(options)}`);

        // additional commands
        let commandsHandler = new UpdateValidCommands(this.commands, builtinCommands);
        commandsHandler.readOptions(options);
        options.addTrigger('command', Result.Event.Change, commandsHandler);

        // NOTE: we have to listen at this level because we need the options object in the handler, but
        // really we would not want to listen for all deletes, just command ones
        options.addTrigger('delete', Result.Event.Change, commandsHandler);

        // debugging
        let debugHandler = new UpdateDebug();
        debugHandler.readOptions(options);
        options.addTrigger('debug', Result.Event.Change, debugHandler);

        // verbose responses
        let verboseHandler = new UpdateVerbose();
        verboseHandler.readOptions(options);
        options.addTrigger('verbose', Result.Event.Change, verboseHandler);
    }

    handleParserResult(context: PluginParserContext, result: Result.Any): void {
        // REVISIT make this a debuggable thing, maybe include last few ones in dump?
        debug.log(`parser result: ${JSON.stringify(result)}`)
        if (result.events.has(Result.Event.Change)) {
            this.saveConfiguration();
        }

        // send any messages to caller, regardless of result
        if (this.verbose) {
            for (let message of result.messages) {
                if (context.source.kind === ConfigurationSource.Kind.Api) {
                    let source = <ConfigurationSource.Api>context.source;
                    sendChat(this.name, `/w "${source.player.get('_displayname')}" ${message}`, null, { noarchive: true });
                } else {
                    debug.log(`  ${message}`);
                }
            }
        }

        // this switch must be exhaustive
        // tslint:disable-next-line:switch-default
        switch (result.kind) {
            case Result.Kind.Failure:
                for (let error of (<Result.Failure>result).errors) {
                    this.reportParseError(error);
                }
                break;
            case Result.Kind.Dialog:
                if (context.source.kind !== ConfigurationSource.Kind.Api) {
                    debug.log(`error: dialog generated for non-interactive configuration command '${context.rest}; ignored`);
                    break;
                }
                let source = <ConfigurationSource.Api>context.source;
                let dialogResult = <Result.Dialog>result;
                let dialog = dialogResult.dialog
                    .replace(new RegExp(ConfigurationParser.MAGIC_COMMAND_STRING, 'g'), context.command)
                    .replace(new RegExp(ConfigurationParser.MAGIC_PLUGIN_STRING, 'g'), this.name);
                debug.log(`dialog from parse: ${dialog.substr(0, 16)}...`);
                switch (dialogResult.destination) {
                    case Result.Dialog.Destination.All:
                    case Result.Dialog.Destination.AllPlayers:
                        sendChat(this.name, `${dialog}`, null);
                        break;
                    case Result.Dialog.Destination.Caller:
                        sendChat(this.name, `/w "${source.player.get('_displayname')}" ${dialog}`, null, { noarchive: true });
                        break;
                    default:
                        sendChat(this.name, `/w GM ${dialog}`, null, { noarchive: true });
                }
                break;
            case Result.Kind.Success:
                // REVISIT: make this a generic feature to allow additional commands to trigger follow ups
                if (context.command.endsWith('-show')) {
                    // execute show action after executing command, used in interactive dialogs to
                    // render the new state of the dialog
                    let showResult = this.configurationRoot.show.parse('');
                    return this.handleParserResult(context, showResult);
                }
                break;
            case Result.Kind.Asynchronous:
                // if asynchronous data is needed, retry once available
                this.scheduleFetches(this.levels.fetches, <Result.Asynchronous>result, context);

                // once all fetches are complete, we can retry the command
                this.work.scheduleWork(this.levels.retries, () => {
                    this.parserRetry(context);
                    return Promise.resolve();
                });
                break;
        }
    }

    scheduleFetches(level: PromiseQueue.Level, from: Result.Asynchronous, to: PluginParserContext): void {
        let promisesMap = from.promises;
        // tslint:disable-next-line:forin
        for (let asyncVariable in promisesMap) {
            let handler = (value: any) => {
                to.asyncVariables[asyncVariable] = value;
            };
            this.work.trackPromise(level, promisesMap[asyncVariable], handler);
        }
    }

    parserRetry(context: PluginParserContext) {
        debug.log('parser retry');
        let result = ConfigurationParser.parse(context.rest, this.configurationRoot, context);
        this.handleParserResult(context, result);
    }

    saveConfiguration() {
        let text = JSON.stringify(this.configurationRoot);
        // now that everything is clean, convert back to a dictionary
        let cleaned = JSON.parse(text);
        this.persistence.save(cleaned);
    }

    reportParseError(error: Error) {
        debug.log(`error from parse: ${error.message}`);
        sendChat(this.name, `/w GM ${error.message}`, null, { noarchive: true });
    }

    handleLoaderResults(context: PluginLoaderContext) {
        let followUpWork = false;

        // send any messages to log, regardless of result
        for (let message of context.messages) {
            debug.log(message);
        }

        // now that we have loaded all the sync parts without throwing, schedule async loads
        for (let task of context.asyncLoads) {
            followUpWork = true;
            this.work.trackPromise(this.levels.config, task.promise, task.handler);
        }

        // schedule any commands that are ready, but at configparse level
        for (let command of context.commands) {
            followUpWork = true;
            this.work.scheduleWork(this.levels.configparse, () => {
                let parsing = new PluginParserContext(`!${this.name}`, command.line);
                parsing.source = command.source;
                this.dispatchCommand(parsing);
                return Promise.resolve();
            });
        }

        // Unlike parser work, we don't retry loader work.  Therefore, we have to
        // check if any of our async follow-up work created more async follow-up work.
        // For example, this happens when we read configuration from an asynchronous
        // source.  The loader work will have async loads, after which it will schedule
        // configuration commands to be run.
        if (followUpWork) {
            debug.log('loader work resulted in additional async follow-ups');

            // don't repeat these messages / work lists
            context.messages = [];
            context.asyncLoads = [];
            context.commands = [];

            // after async work is completed, check for new requests
            this.work.scheduleWork(this.levels.followups, () => {
                debug.log('checking results of follow-up loader work');
                this.handleLoaderResults(context);
                return Promise.resolve();
            });
        }
    }

    // work function called when processing a command, may be asynchronous
    private dispatchCommand(context: PluginParserContext) {
        let result = ConfigurationParser.parse(context.rest, this.configurationRoot, context);
        this.handleParserResult(context, result);
    }

    private hookChatMessage() {
        on('chat:message', message => {
            if (message.type !== 'api') {
                return;
            }
            try {
                let player = getObj('player', message.playerid);
                let lines = message.content.split('\n');
                for (let line of lines) {
                    let tokens = ConfigurationParser.tokenizeFirst(line);
                    if (!this.commands.has(tokens[0])) {
                        debug.log(`ignoring command for other plugin: ${line.substring(0, 78)}`);
                        continue;
                    }

                    // this context object will survive until this command line is completely executed, including retries
                    let context = new PluginCommandExecution(player, message, tokens[0], tokens[1]);

                    // REVISIT consult access control tree
                    if (!playerIsGM(player.id)) {
                        this.reportParseError(new Error(`player ${player.get('_displayname')} tried to use GM command ${tokens[0]}`));
                        return;
                    }

                    // short circuit dump command for debugging
                    if (context.rest === 'dump') {
                        this.dispatchCommand(context);
                        return;
                    }   

                    // run on command queue, which does not execute unless everything else is done
                    this.work.scheduleWork(this.levels.commands, () => {
                        this.dispatchCommand(context);
                        return Promise.resolve();
                    });
                }
            } catch (error) {
                this.reportParseError(error);
            }
        });
    }

    hookReady() {
        on('ready', () => {
            this.persistence = startPersistence(this.name);
            this.restoreConfiguration();
            this.hookChatMessage();
            this.configureHandoutsSupport();
            this.work.scheduleWork(this.levels.commands, () => {
                // this will run when everything else is done and we are ready for commands
                for (let command of this.commands) {
                    log(`plugin command ${command} loaded`);
                }
                return Promise.resolve();
            });
        });
    }
    
    // initialize mixin, if installed
    configureHandoutsSupport() {
        // not installed
    }
}

// plugin singleton, populated by calling 'start' function
// NOTE: the plugin class is not exposed to the actual plugins and is not exported from this module
// so that we can create different plugin cores without breaking existing plugins
var plugin: Plugin<any>;

export function start<T>(pluginName: string, factory: DefaultConstructed<T>) {
    if (typeof log !== 'function') {
        throw new Error('this script includes a module that can only be run in the actual Roll20 environment; please create a separate test script or run in Roll20');
    }

    // configure our host script to log under our name
    console.log = (message: any) => {
        let stamp = new Date().toISOString();
        log(`${stamp} ${pluginName || 'der20'}: ${message}`);
    };

    // singleton, make sure this is set before we do any work on start up
    plugin = new Plugin(pluginName, factory);
    plugin.start();
}

// install a mix-in extension to the Plugin class (if base is omitted) or another default constructed class
export function addExtension<B, E>(extension: DefaultConstructed<E>, base?: DefaultConstructed<B>): void {
    for (let key of Object.getOwnPropertyNames(extension.prototype)) {
        let target = base || Plugin;
        let original = target.prototype[key];
        let extended = extension.prototype[key];
        if (key === 'constructor') {
            // we aren't changing what class this is, so any constructor code in extension is lost
            continue;
        }
        if ((original !== null) && (extended === undefined)) {
            // don't overwrite features of original with declared but undefined functions
            continue;
        }
        target.prototype[key] = extension.prototype[key];
    }
}

export class DumpCommand extends ConfigurationCommand {
    parse(line: string): Result.Any {
        let dialog = new Der20Dialog(`${ConfigurationParser.MAGIC_COMMAND_STRING} `);
        dialog.beginControlGroup();
        dialog.addTextLine(JSON.stringify(plugin.configurationRoot));
        dialog.addTextLine(JSON.stringify(plugin.work));
        dialog.endControlGroup();
        return new Result.Dialog(Result.Dialog.Destination.Caller, dialog.render());
    }
}

export class ResetCommand extends ConfigurationCommand {
    parse(line: string): Result.Any {
        if (line !== 'all configuration') {
            return new Result.Failure(new Error(`reset command must match 'reset all configuration' exactly`));
        }
        // we are running at lowest priority (command, concurrency 1) so we know there is no work running
        plugin.work.cancel();

        // now rebuild the config from defaults
        plugin.reset();
        plugin.saveConfiguration();
        plugin.configureHandoutsSupport();
        return new Result.Success('all stored state and configuration reset');
    }
}

class ContextBase implements ConfigurationContext {
}

export class PluginLoaderContext extends ContextBase implements LoaderContext {
    messages: string[] = [];
    commands: { source: ConfigurationSource.Any; line: string }[] = [];
    asyncLoads: { promise: Promise<any>; handler: (value: any) => void }[] = [];

    addMessage(message: string): void {
        this.messages.push(message);
    }

    addCommand(source: ConfigurationSource.Any, command: string): void {
        this.commands.push({ source: source, line: command });
    }

    addAsynchronousLoad<T>(promise: Promise<T>, whenDone: (value: T) => void): void {
        this.asyncLoads.push({ promise: promise, handler: whenDone });
    }
}

export class PluginParserContext extends ContextBase implements ParserContext {
    source: ConfigurationSource.Any;
    asyncVariables: Record<string, any> = {};

    constructor(public command: string, public rest: string) {
        super();
        // generated
    }
}

export class PluginCommandExecution extends PluginParserContext {
    source: ConfigurationSource.Api;
    constructor(player: Player, message: ApiChatEventData, command: string, public rest: string) {
        super(command, rest);
        // generated code
        this.source = new ConfigurationSource.Api(player, message);
    }
}

abstract class OptionsUpdate extends ConfigurationUpdate.Base {
    execute(configuration: any, context: ParserContext, result: Result.Any): Result.Any {
        this.readOptions(<Options>configuration);
        return result;
    }

    abstract readOptions(options: Options): void;
}

class UpdateValidCommands extends OptionsUpdate {
    constructor(private commands: Set<string>, private builtin: string[]) {
        super();
        // generated
    }

    readOptions(options: Options) {
        this.commands.clear();
        for (let builtinCommand of this.builtin) {
            this.commands.add(builtinCommand);
        }
        for (let command of options.commands.value()) {
            let bangCommand = `!${command}`;
            debug.log(`enabling additional command string '${bangCommand}'`)
            this.commands.add(bangCommand);
        }
    }
}

class UpdateDebug extends OptionsUpdate {
    readOptions(options: Options) {
        if (options.debug.value()) {
            debug.log = console.log;
        } else {
            debug.log = (message: string) => { /* ignore */ };
        }
    }
}

class UpdateVerbose extends OptionsUpdate {
    readOptions(options: Options): void {
        plugin.verbose = options.verbose.value();
    }
}