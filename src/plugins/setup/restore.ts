import { SelectedTokensSimpleCommand, Der20Token } from 'der20/library';
import { ParserContext } from 'der20/library';
import { Result, Success } from 'der20/library';
import { PositionData } from './data';

export class RestoreCommand extends SelectedTokensSimpleCommand {
    constructor(private data: PositionData) {
        super();
        // generated code
    }

    handleToken(token: Der20Token, parserContext: ParserContext, tokenIndex: number): Result {
        let position = this.data.dictionary[token.id];
        if (position === undefined) {
            // don't consider this a failure; let the rest of the tokens restore
            return new Success('a selected token does not have a saved position');
        }
        token.raw.set(position);
        return new Success('token position restored');
    }
}
