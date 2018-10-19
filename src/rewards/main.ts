import { Configuration } from "./configuration";
import { ConfigurationParser } from "derlib/config";

declare var on: any;
declare var getObj: any;
declare var sendChat: any;

var configuration: Configuration = new Configuration();
const name: string = 'rewards';

on('ready', function () {
    console.log('loaded');
});

on('chat:message', (msg) => {
    if (msg.type != 'api') {
        return;
    }
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
        if (result.error) {
            console.log(`error from parse: ${result.error}`);
            sendChat(name, `/w GM ${result.error}`, null, { noarchive: true });
            continue;
        }
        if ((!result.dialog) && tokens[0].endsWith('-show')) {
            result = configuration.show.parse('');
            if (result.error) {
                console.log(`error from ui refresh: ${result.error}`);
                sendChat(name, `/w GM ${result.error}`, null, { noarchive: true });
                continue;
            }
        }
        if (result.dialog) {
            console.log(`dialog from parse: ${result.dialog.substr(0, 10)}...`);
            sendChat(name, `/w "${player.get('displayname')}" ${result.dialog}`, null, { noarchive: true });
            continue;
        }
        // otherwise nothing returned
    }
});