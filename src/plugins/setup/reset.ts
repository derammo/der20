import { SelectedTokensSimpleCommand, Der20Token } from 'der20/library';
import { ParserContext } from 'der20/library';
import { Result, Success } from 'der20/library';
import { DarkvisionCommand } from './darkvision';
import { LightCommand } from './light';

export class TokenResetCommand extends SelectedTokensSimpleCommand {
    static execute(token: Der20Token, parserContext: ParserContext, tokenIndex: number): Result {
        const character = token.character;
        if (character === undefined) {
            return new Success('ignoring token that is not linked to character');
        }
        if (!character.isNpc()) {
            return new Success('reset ignoring token that is not an NPC/Monster');
        }
        /* eslint-disable @typescript-eslint/naming-convention */
        token.raw.set({
            statusmarkers: '',
            bar1_value: null,
            bar1_link: '',
            bar1_max: null,
            bar2_value: null,
            bar2_link: '',
            bar2_max: null,
            bar3_value: null,
            bar3_link: '',
            bar3_max: null
        });
        LightCommand.setDefaultsNoLight(token);
        DarkvisionCommand.setDefaultsNoDarkvision(token);

        /* eslint-enable @typescript-eslint/naming-convention */
        return new Success('reset character token');
    }

    handleToken(token: Der20Token, parserContext: ParserContext, tokenIndex: number): Result {
        return TokenResetCommand.execute(token, parserContext, tokenIndex);
    }
}
