import { Der20Token, SelectedTokensCommand } from 'derlib/roll20/token';
import { ParserContext } from 'derlib/config/context';
import { Result } from 'derlib/config/result';
import { makeImageSourceURL } from './images';

export class RevealCommand extends SelectedTokensCommand {
    handleToken(token: Der20Token, context: ParserContext, tokenIndex: number): Result.Any {
        let character = token.character;
        if (character === undefined) {
            return new Result.Success(`selected token does not represent any journal entry and won't be changed`);
        }
        if (!character.isNpc()) {
            return new Result.Success(`'${character.name}' is not an NPC/Monster and won't be changed`);
        }
        // because of request fan-out (selected tokens) we may have many images for which we are waiting
        const imageKey = `RevealCommand_image_${tokenIndex}`;
        let imageSource = context.asyncVariables[imageKey];
        if (imageSource === undefined) {
            return new Result.Asynchronous(`loading default token info from '${character.name}'`, imageKey, character.imageLoad());
        }
        token.raw.set({ imgsrc: makeImageSourceURL(imageSource.url), name: character.name, showname: true, showplayers_name: true });
        return new Result.Success(`setting token to show its default name and image from '${character.name}'`);
    }
}
