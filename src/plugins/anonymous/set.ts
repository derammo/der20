import { Der20Token, SelectedTokensSimpleCommand } from 'der20/library';
import { Result, Success, Failure } from 'der20/library';

var defaultToken: string;

export function setDefaultToken(token: string) {
    defaultToken = token;
}

export class SetCommand extends SelectedTokensSimpleCommand {
    handleToken(token: Der20Token, parserContext: any, tokenIndex: number): Result {
        let character = token.character;
        if (character === undefined) {
            return new Success(`selected token does not represent any journal entry and won't be changed`);
        }
        if (!character.isNpc()) {
            return new Success(`'${character.name}' is not an NPC/Monster and won't be changed`);
        }
        let anonymousName = character.attribute('npc_type').get('current');
        if (anonymousName.length > 0) {
            anonymousName = anonymousName.split(/[,(]/)[0];
        } else {
            anonymousName = '';
        }
        if (defaultToken === undefined) {
            token.raw.set({ name: anonymousName, showname: true, showplayers_name: true });
            return new Success(`token for '${character.name}' changed to show only creature type; anonymous character to use as icon is not configured`);
        }
        let midnight = new Date();
        midnight.setHours(0, 0, 0, 0);
        let cacheDefeat = `${midnight.valueOf() / 1000}`;
        let anonymousIcon = `${defaultToken}?${cacheDefeat}`;
        debug.log(`setting token to: ${anonymousIcon}`);
        token.raw.set({ imgsrc: anonymousIcon, name: anonymousName, showname: true, showplayers_name: true });
        debug.log(`result after set: ${token.image.url}`);
        if (anonymousIcon !== token.image.url) {
            return new Failure(new Error(`token for '${character.name}' could not change image; the anonymous character has a marketplace image or otherwise restricted image`));
        }
        return new Success(`token for '${character.name}' changed to show only creature type and anonymous icon`);
    }
}