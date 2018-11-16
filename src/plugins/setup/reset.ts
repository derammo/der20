import { SelectedTokensSimpleCommand, Der20Token } from 'der20/library';
import { ParserContext } from 'der20/library';
import { Result, Success } from 'der20/library';

export class TokenResetCommand extends SelectedTokensSimpleCommand {
    static execute(token: Der20Token, parserContext: ParserContext, tokenIndex: number): Result {
        const character = token.character;
        if (character === undefined) {
            return new Success('ignoring token that is not linked to character');
        }
        if (!character.isNpc()) {
            return new Success('reset ignoring token that is not an NPC/Monster');
        }
        token.raw.set({
            statusmarkers: '',
            bar1_value: 0,
            bar1_link: '',
            bar1_max: '',
            bar2_value: '',
            bar2_link: '',
            bar2_max: '',
            bar3_value: '',
            bar3_link: '',
            bar3_max: ''
        });
        return new Success('reset character token');
    }

    handleToken(token: Der20Token, parserContext: ParserContext, tokenIndex: number): Result {
        return TokenResetCommand.execute(token, parserContext, tokenIndex);
    }
}
