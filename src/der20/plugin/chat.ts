import { CommandInput } from "der20/interfaces/config";
import { CommandSource, CommandSink } from "der20/interfaces/source";
import { LoaderContext } from "der20/interfaces/loader";
import { CommandInputImpl } from "der20/config/input";


/**
 * Command was submitted via ! API command
 */
export class ApiCommandInput extends CommandInputImpl.Base {
    constructor(public player: Player, public message: ApiChatEventData) {
        super(CommandInput.Kind.api);
    }

    authorize(rest: string): boolean {
        // so far, we don't have an authorization tree for players
        // REVISIT: when we do, we will let the CommandSink parse commands and enumerate them back to us here
        return true;
    }
}

/**
 * This is the most typical command source.  It reads commands from API Chat Events
 */
export class ChatCommandSource implements CommandSource {
    constructor(options: any, private plugin: CommandSink) {
        // generated code
    }

    restore(context: LoaderContext): void {
        on('chat:message', message => {
            if (message.type !== 'api') {
                return;
            }
            try {
                this.plugin.swapIn();
                let player = getObj('player', message.playerid);
                let lines = message.content.split('\n');
                const source = new ApiCommandInput(player, message);
                for (let line of lines) {
                    // REVISIT consult access control tree
                    if (!playerIsGM(player.id)) {
                        this.plugin.reportParseError(new Error(`player ${player.get('_displayname')} tried to use GM command ${line.substring(0, 78)}`));
                        return;
                    }
                    this.plugin.dispatchCommands(source, line);
                }
            } catch (error) {
                this.plugin.handleErrorThrown(error);
            }
        });
    }

    query(context: LoaderContext, opaque: any): void {
        // unused
    }
}