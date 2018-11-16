import { SelectedTokensSimpleCommand, Der20Token } from 'der20/library';
import { ParserContext } from 'der20/library';
import { Result, Change } from 'der20/library';
import { PositionData } from './data';

export class SaveCommand extends SelectedTokensSimpleCommand {
    constructor(private data: PositionData) {
        super();
        // generated code
    }

    handleToken(token: Der20Token, parserContext: ParserContext, tokenIndex: number): Result {
        var position = {
            layer: token.raw.get('layer'),
            left: token.raw.get('left'),
            top: token.raw.get('top'),
            width: token.raw.get('width'),
            height: token.raw.get('height'),
            rotation: token.raw.get('rotation')
        };
        this.data.dictionary[token.id] = position;
        return new Change('token position saved');
    }
}
