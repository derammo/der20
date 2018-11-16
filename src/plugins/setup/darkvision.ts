import { Der20Token, SelectedTokensCommand } from 'der20/library';
import { ParserContext } from 'der20/library';
import { Result } from 'der20/library';

export class DarkvisionCommand extends SelectedTokensCommand {
    handleTokenCommand(token: Der20Token, line: string, parserContext: ParserContext, tokenIndex: number): Result {
        throw new Error("XXX Method not implemented.");
    }
}
