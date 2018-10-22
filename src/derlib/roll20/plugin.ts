import { Result } from "derlib/config/result";
import { startPersistence } from "derlib/persistence";
import { ConfigurationPersistence } from "derlib/config/persistence";
import { ConfigurationParser } from "derlib/config/parser";

// from our module header
declare var console: any;

// from Roll20
// REVISIT create a module that loads either real interface or emulator
declare var log: any;
declare var on: any;
declare var getObj: any;
declare var sendChat: any;

var pluginName: string;
var configurationRoot: any;
var persistence: ConfigurationPersistence;

if (typeof log !== 'function') {
    throw new Error('this script includes a module that can only be run in the actual Roll20 environment; please create a separate test script');
}

console.log = (message) => {
    let stamp = new Date().toISOString();
    log(`${stamp} ${pluginName||'der20'}: ${message}`)
};

function handleResult(player: any, command: string, result: Result.Any): Result.Any {
	if (result.events.has(Result.Event.Change)) {
		let text = JSON.stringify(configurationRoot);
		// now that everything is clean, convert back to a dictionary
		let cleaned = JSON.parse(text);
		persistence.save(cleaned);
    }
    
    // this switch must be exhaustive
    // tslint:disable-next-line:switch-default
    switch (result.kind) {
        case Result.Kind.Failure:
            for (let error of (<Result.Failure>result).errors) {
                reportError(error);
            }
            return result;
        case Result.Kind.Dialog:
            let dialog = (<Result.Dialog>result).dialog.replace(ConfigurationParser.MAGIC_COMMAND_STRING, command);
            console.log(`dialog from parse: ${dialog.substr(0, 10)}...`);
            sendChat(pluginName, `/w "${player.get('displayname')}" ${dialog}`, null, { noarchive: true });
            return new Result.Success();
        case Result.Kind.Success:
            if (command.endsWith('-show')) {
                // execute show action after executing command, used in interactive dialogs to
                // render the new state of the dialog
                let showResult = configurationRoot.show.parse('');
                return handleResult(player, '', showResult);
            }
            return result;
    }
}

function reportError(error: Error) {
    console.log(`error from parse: ${error.message}`);
    sendChat(pluginName, `/w GM ${error.message}`, null, { noarchive: true });
}

export function start(name: string, configuration: any) {
    pluginName = name;
    configurationRoot = configuration;
    persistence = startPersistence(pluginName);
    
    let json = persistence.load();
    ConfigurationParser.restore(json, configurationRoot);

    on('ready', function () {
        console.log('loaded');
    });

    on('chat:message', (msg) => {
        if (msg.type !== 'api') {
            return;
        }
        try {
            let player = getObj('player', msg.playerid);
            let lines = msg.content.split('\n');
            let validCommands = new Set([`!${pluginName}`, `!${pluginName}-show`]);
            for (let line of lines) {
                let tokens = ConfigurationParser.tokenizeFirst(line);
                if (!validCommands.has(tokens[0])) {
                    console.log(`ignoring line: ${line}`);
                    continue;
                }
                let result = ConfigurationParser.parse(tokens[1], configuration);
                result = handleResult(player, tokens[0], result);
                if (result.kind === Result.Kind.Failure) {
                    // REVISIT should we stop processing lines in this block?
                }
            }
        } catch (error) {
            reportError(error);
        }
    });
}
