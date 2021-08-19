import { Der20Character, Der20Token, SelectedTokensSimpleCommand } from 'der20/library';
import { Result, Success, Failure } from 'der20/library';
import { Der20Attribute } from 'der20/library';
import { WhisperConfiguration } from './whisper';

var defaultToken: string;

export function setDefaultToken(token: string) {
    defaultToken = token;
}
export class SetCommand extends SelectedTokensSimpleCommand {
    constructor(private whisper: WhisperConfiguration) {
        super();
    }
    
    handleToken(token: Der20Token, parserContext: any, tokenIndex: number): Result {
        let character = token.character;
        if (character === undefined) {
            return new Success(`selected token does not represent any journal entry and won't be changed`);
        }
        if (!character.isNpc()) {
            return new Success(`'${character.name}' is not an NPC/Monster and won't be changed`);
        }
        
        // figure out an anonymous description to use instead of a name
        let anonymousName = this.calculateAnonymousName(character);

        if (this.whisper.set.value()) {
            debug.log(`setting ${character.name} to always whisper rolls`);
            var wtype: Der20Attribute = character.attribute("wtype");
            if (!wtype.exists) {
                // need to create attribute, because it is not present by default
                wtype = Der20Attribute.create(character, "wtype");
            }
            wtype.raw.setWithWorker("current", "/w gm");
        }

        // if no image is configured, just do the name part
        if (defaultToken === undefined) {
            token.raw.set({ name: anonymousName, showname: true, showplayers_name: true });
            return new Success(`token for '${character.name}' changed to show only creature type; anonymous character to use as icon is not configured`);
        }

        // set a cacheable icon as the graphic image
        let cacheDefeat = this.calculateCacheDefeat();
        let anonymousIcon = `${defaultToken}?${cacheDefeat}`;
        debug.log(`setting token to: ${anonymousIcon}`);
        token.raw.set({ imgsrc: anonymousIcon, name: anonymousName, showname: true, showplayers_name: true });

        // setting validates if this image is allowed
        debug.log(`result after set: ${token.image.url}`);
        if (anonymousIcon !== token.image.url) {
            return new Failure(new Error(`token for '${character.name}' could not change image; the anonymous character has a marketplace image or otherwise restricted image`));
        }

        return new Success(`token for '${character.name}' changed to show only creature type and anonymous icon`);
    }

    private calculateCacheDefeat() {
        let midnight = new Date();
        midnight.setHours(0, 0, 0, 0);
        let cacheDefeat = `${midnight.valueOf() / 1000}`;
        return cacheDefeat;
    }

    private calculateAnonymousName(character: Der20Character) {
        let anonymousName = character.attribute('npc_type').value('');
        if (anonymousName.length > 0) {
            anonymousName = anonymousName.split(/[,(]/)[0];
        }
        return anonymousName;
    }
}