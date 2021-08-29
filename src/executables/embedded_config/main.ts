import { Plugin } from 'der20/library';
import { Configuration } from 'plugins/setup/configuration';

declare global {
    function log(message: any): void;
    function sendChat(speakingAs: string, message: string, callback?: (operations: ChatEventData[]) => void, options?: ChatMessageHandlingOptions): void;
    var der20ScriptMode: string;
    function on(event: string, handler: any): void;
    function getObj(type: string, options: any): any | undefined;
}

// fake globals
global.log = console.log;
global.sendChat = (speakingAs: string, message: string, callback?: (operations: ChatEventData[]) => void, options?: ChatMessageHandlingOptions) => {
    debug.log(message);
};
global.der20ScriptMode = 'mock';
global.on = (_event: string) => { return; };
global.getObj = (_type:string, _options: any) => { return undefined; };

debug.log = console.log;

new Plugin('embedded_config', Configuration)
.addDefaults([
    '!embedded_config option verbose true',
    '!embedded_config option debug true',
    '!wrong tokens hp maximized',
    '!embedded_config tokens hp maximized',
    '!embedded_config tokens stat',
    '!embedded_config character blablabla hp 12'
])
.start();