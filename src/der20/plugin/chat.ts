import { CommandSource } from "der20/interfaces/config";
import { ConfigurationCommandSource, CommandSink } from "der20/interfaces/source";
import { LoaderContext } from "der20/interfaces/loader";
import { CommandSourceImpl } from "der20/config/source";


/**
 * Command was submitted via ! API command
 */
export class ApiCommandSource extends CommandSourceImpl.Base {
    constructor(public player: Player, public message: ApiChatEventData) {
        super(CommandSource.Kind.Api);
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
export class ChatCommandSource implements ConfigurationCommandSource {
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
                for (let line of lines) {
                    // REVISIT consult access control tree
                    if (!playerIsGM(player.id)) {
                        this.plugin.reportParseError(new Error(`player ${player.get('_displayname')} tried to use GM command ${line.substring(0, 78)}`));
                        return;
                    }
                    const source = new ApiCommandSource(player, message);
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