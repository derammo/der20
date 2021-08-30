import { CommandInput } from 'der20/interfaces/config';
import { ParserContext } from 'der20/interfaces/parser';
import { DialogFactory } from 'der20/interfaces/ui';
import { Options } from 'der20/plugin/options';
import { Der20ChatDialog } from 'der20/roll20/dialog';
import { ContextBase, ContextHost } from "./context_base";

export class PluginParserContext extends ContextBase implements ParserContext {
    asyncVariables: Record<string, any> = {};
    dialog: DialogFactory = Der20ChatDialog;

    constructor(parent: ContextHost, options: Options, public input: CommandInput, public command: string, public rest: string) {
        super(parent, options);
        // generated
    }
}
