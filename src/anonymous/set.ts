import { SelectedTokensCommand, Der20Token } from "derlib/roll20/token";
import { Result } from "derlib/config/result";

var defaultToken: string;

export function setDefaultToken(token: string) {
    defaultToken = token;
}

export class SetCommand extends SelectedTokensCommand {
    handleToken(token: Der20Token, parserContext: any, tokenIndex: number): Result.Any {
        let character = token.character;
        if (character === undefined) {
            return new Result.Success(`selected token does not represent any journal entry and won't be changed`);
        }
        if (!character.isNpc()) {
            return new Result.Success(`'${character.name}' is not an NPC/Monster and won't be changed`);
        }
        let anonymousName = character.attribute('npc_type').get('current');
        if (anonymousName.length > 0) {
            anonymousName = anonymousName.split(/[,(]/)[0];
        } else {
            anonymousName = '';
        }
        if (defaultToken === undefined) {
            token.raw.set({ name: anonymousName, showname: true, showplayers_name: true });
            return new Result.Success(`token for '${character.name}' changed to show only creature type; anonymous character to use as icon is not configured`);
        }
        let midnight = new Date();
        midnight.setHours(0, 0, 0, 0);
        let cacheDefeat = `${midnight.valueOf() / 1000}`;
        let anonymousIcon = `${defaultToken}?${cacheDefeat}`;

        token.raw.set({ imgsrc: anonymousIcon, name: anonymousName, showname: true, showplayers_name: true });
        debug.log(`setting token to ${anonymousIcon}, result: ${token.image.url}`);
        return new Result.Success(`token for '${character.name}' changed to show only creature type and anonymous icon`);
    }
}