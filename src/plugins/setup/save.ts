import { SelectedTokensCommand, Der20Token } from 'der20/library';
import { ParserContext } from 'der20/library';
import { Result, Change } from 'der20/library';
import { PositionData } from './data';

export class SaveCommand extends SelectedTokensCommand {
    constructor(private data: PositionData) {
        super();
        // generated code
    }

    handleTokenCommand(_message: ApiChatEventData, token: Der20Token, _text: string, _parserContext: ParserContext, _tokenIndex: number): Promise<Result> {
        let position = {
            layer: token.raw.get('layer'),
            left: token.raw.get('left'),
            top: token.raw.get('top'),
            width: token.raw.get('width'),
            height: token.raw.get('height'),
            rotation: token.raw.get('rotation')
        };
        this.data.dictionary[token.id] = position;
        return new Change('token position saved').resolve();
    }
}
