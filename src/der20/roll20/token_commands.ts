import { CommandSource } from "der20/interfaces/config";
import { LoaderContext } from "der20/interfaces/loader";
import { CommandSink } from "der20/interfaces/source";
import { Options } from "der20/plugin/options";
import { CommandsFromNotes } from "./notes_commands";

export class CommandsFromTokens extends CommandsFromNotes {
    constructor(options: Options, plugin: CommandSink, subtrees: string[]) {
        super(plugin, subtrees);  
    }

    // creates async command work
    restore(context: LoaderContext) {
        const start = Date.now();
        for (let token of this.getTokens()) {
            this.readToken(token, context);
        }
        debug.log(`completed scan of all tokens in ${Date.now() - start}ms`);
        // register for changes
        on('change:graphic', (current: any, previous: any) => {
            this.plugin.swapIn();
            if (current.get('gmnotes') !== previous.gmnotes) {
                this.plugin.queryCommandSource(this, current);
            }
        });
    }        
    
    // creates async command work in response to callback
    query(context: LoaderContext, opaque: any) {
        if (opaque === undefined) {
            for (let token of this.getTokens()) {
                this.readToken(token, context);
            }
            return;
        }
        this.readToken(opaque, context);
    }

    private getTokens(): Graphic[] {
        let tokens = findObjs({ _type: 'graphic' });
        debug.log(`scanning ${tokens.length} tokens`);
        return tokens.map((object) => {
            if (object === undefined) {
                throw new Error('unexpected undefined token in result array');
            }
            return <Graphic>object;
        });
    }

    // WARNING: the Graphic type in api.d.ts is incorrectly claiming gmnotes is a synchronous read property, so we can't use the type here
    readToken(token: any, context: LoaderContext) {
        // check ownership of token to make sure it is not editable by player, who could be sending us commands via import
        let controllers = token.get('controlledby');
        let name = token.get('name');
        if (controllers !== undefined) {
            if (controllers.length > 0) {
                context.addMessage(`token ${name} is controlled by ${controllers} and may therefore not be used for configuration`);
                return;
            }
        }
        let text = token.get('gmnotes');
        if (text.length < 1) {
            return;
        }
        // token gmnotes are URL escaped for some reason
        text = text.replace(/%([0-9A-F][0-9A-F])/g, (match: string, hex2: string) => {
            return String.fromCharCode(parseInt(hex2, 16));
        });
        // now do our regular quick scan for a command
        // as long as some plugin command is the first line, we invest the time to read through
        if (!text.match(/^(<[a-z0-9]+>)*"?!/g)) {
            // debug.log('ignoring token that does not have a command in the first line of GM Notes');
            // debug.log(`ignored GM Notes start with '${text.substring(0,79)}...'`)
            return;
        }

        // read text
        this.dispatchLines(text, CommandSource.Kind.Token, 'graphic', token.id);
    }
}