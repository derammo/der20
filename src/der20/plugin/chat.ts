import { CommandInput } from "der20/interfaces/config";
import { CommandSource, CommandSink } from "der20/interfaces/source";
import { CommandInputImpl } from "der20/config/input";
import { LoaderContext } from "der20/interfaces/loader";


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
    constructor(options: any, private sink: CommandSink) {
        // generated code
    }

    restore(_context: LoaderContext): Promise<void> {
        on('chat:message', message => {
            if (message.type !== 'api') {
                return;
            }
            try {
                this.sink.swapIn();
                let player = getObj('player', message.playerid);
                let lines = message.content.split('\n');
                const source = new ApiCommandInput(player, message);
                for (let line of lines) {
                    // REVISIT consult access control tree
                    if (!playerIsGM(player.id)) {
                        this.sink.reportParseError(new Error(`player ${player.get('_displayname')} tried to use GM command ${line.substring(0, 78)}`));
                        return;
                    }
                    this.sink.dispatchCommands(source, line);
                }
            } catch (error) {
                this.sink.handleErrorThrown(error);
            }
        });
        return Promise.resolve();
    }

    query(_context: LoaderContext, _opaque: any): Promise<void> {
        // unused
        return Promise.resolve();
    }
}