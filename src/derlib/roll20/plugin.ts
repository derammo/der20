import { ConfigurationParser, ConfigurationChooser, ConfigurationAlias, ConfigurationPersistence, ConfigurationFile, ConfigurationTemp } from "derlib/config";
import { Result } from "derlib/config/result";
import { startPersistence } from "derlib/persistence";

declare var on: any;
declare var getObj: any;
declare var sendChat: any;

var configurationRoot: any;
var persistence: ConfigurationPersistence;

function handleResult(player: any, command: string, result: Result.Any): Result.Any {
	if (result.events.has(Result.Event.Change)) {
		let text = JSON.stringify(configurationRoot);
		// now that everything is clean, convert back to a dictionary
		let cleaned = JSON.parse(text);
		persistence.save(cleaned);
	}
    switch (result.kind) {
        case Result.Kind.Failure:
            for (let error of (<Result.Failure>result).errors) {
                reportError(error);
            }
            return result;
        case Result.Kind.Dialog:
            let dialog = (<Result.Dialog>result).dialog.replace(ConfigurationChooser.MAGIC_COMMAND_STRING, command);
            console.log(`dialog from parse: ${dialog.substr(0, 10)}...`);
            sendChat(name, `/w "${player.get('displayname')}" ${dialog}`, null, { noarchive: true });
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
    console.log(`error from parse: ${error}`);
    sendChat(name, `/w GM ${error}`, null, { noarchive: true });
}

export function start(name: string, configuration: any) {
    configurationRoot = configuration;
    persistence = startPersistence(name);
    
    let json = persistence.load();
    ConfigurationParser.restore(json, configurationRoot);

    on('ready', function () {
        console.log('loaded');
    });

    on('chat:message', (msg) => {
        if (msg.type != 'api') {
            return;
        }
        try {
            let player = getObj('player', msg.playerid);
            let lines = msg.content.split('\n');
            let validCommands = new Set([`!${name}`, `!${name}-show`]);
            for (let line of lines) {
                let tokens = ConfigurationParser.tokenizeFirst(line);
                if (!validCommands.has(tokens[0])) {
                    console.log(`ignoring line: ${line}`);
                    continue;
                }
                let result = ConfigurationParser.parse(tokens[1], configuration);
                result = handleResult(tokens[0], player, result);
                if (result.kind == Result.Kind.Failure) {
                    // REVISIT should we stop processing lines in this block?
                }
            }
        } catch (error) {
            reportError(error);
        }
    });
}
