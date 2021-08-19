import { Der20Token, SelectedTokensSimpleCommand } from 'der20/library';
import { ParserContext } from 'der20/library';
import { Result, Success, Asynchronous } from 'der20/library';
import { Der20Attribute } from 'der20/library';
import { makeImageSourceURL } from './images';
import { WhisperConfiguration } from './whisper';

export class RevealCommand extends SelectedTokensSimpleCommand {
    constructor(private whisper: WhisperConfiguration) {
        super();
    }
    
    handleToken(token: Der20Token, context: ParserContext, tokenIndex: number): Result {
        let character = token.character;
        if (character === undefined) {
            return new Success(`selected token does not represent any journal entry and won't be changed`);
        }
        if (!character.isNpc()) {
            return new Success(`'${character.name}' is not an NPC/Monster and won't be changed`);
        }
        
        if (this.whisper.unset.value()) {
            debug.log(`setting ${character.name} to no longer whisper rolls`);
            var wtype: Der20Attribute = character.attribute("wtype");
            if (wtype.exists) {
                wtype.raw.setWithWorker("current", "");
            }
        }

        // because of request fan-out (selected tokens) we may have many images for which we are waiting
        const imageKey = `RevealCommand_image_${tokenIndex}`;
        let imageSource = context.asyncVariables[imageKey];
        if (imageSource === undefined) {
            return new Asynchronous(`loading default token info from '${character.name}'`, imageKey, character.imageLoad());
        }

        // reset back to the original image
        token.raw.set({ imgsrc: makeImageSourceURL(imageSource.url), name: character.name, showname: true, showplayers_name: true });
        return new Success(`setting token to show its default name and image from '${character.name}'`);
    }
}
