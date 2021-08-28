import { SelectedTokensCommand, Der20Token } from 'der20/library';
import { ParserContext } from 'der20/library';
import { Result, Success } from 'der20/library';
import { PositionData } from './data';
export class RestoreCommand extends SelectedTokensCommand {
    constructor(private data: PositionData) {
        super();
        // generated code
    }

    handleTokenCommand(_message: ApiChatEventData, token: Der20Token, _text: string, _parserContext: ParserContext, _tokenIndex: number): Promise<Result> {
        let position = this.data.dictionary[token.id];
        if (position === undefined) {
            // don't consider this a failure; let the rest of the tokens restore
            return new Success('a selected token does not have a saved position').resolve();
        }
        token.raw.set(position);
        return new Success('token position restored').resolve();
    }
}
