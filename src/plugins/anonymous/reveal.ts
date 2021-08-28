import { Der20Token, SelectedTokensCommand } from 'der20/library';
import { ParserContext } from 'der20/library';
import { Result, Success } from 'der20/library';
import { Der20Attribute } from 'der20/library';
import { Der20CharacterImage } from 'der20/library';
import { makeImageSourceURL } from './images';
import { WhisperConfiguration } from './whisper';

export class RevealCommand extends SelectedTokensCommand {
    constructor(private whisper: WhisperConfiguration) {
        super();
    }
    
    handleTokenCommand(_message: ApiChatEventData, token: Der20Token, _text: string, context: ParserContext, tokenIndex: number): Promise<Result> {
        let character = token.character;
        if (character === undefined) {
            return new Success(`selected token does not represent any journal entry and won't be changed`).resolve();
        }
        if (!character.isNpc()) {
            return new Success(`'${character.name}' is not an NPC/Monster and won't be changed`).resolve();
        }
        
        if (this.whisper.unset.value()) {
            debug.log(`setting ${character.name} to no longer whisper rolls`);
            let wtype: Der20Attribute = character.attribute("wtype");
            if (wtype.exists) {
                wtype.raw.setWithWorker("current", "");
            }
        }

        // because of request fan-out (selected tokens) we may have many images for which we are waiting
        return character.imageLoad()
            .then((image: Der20CharacterImage) => {
                context.swapIn();
                // reset back to the original image
                // eslint-disable-next-line @typescript-eslint/naming-convention
                token.raw.set({ imgsrc: makeImageSourceURL(image.url), name: character.name, showname: true, showplayers_name: true });
                return new Success(`setting token to show its default name and image from '${character.name}'`);
            });
    }
}
