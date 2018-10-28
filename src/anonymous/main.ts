import { Der20Token, SelectedTokensCommand } from 'derlib/roll20/token';
import { ConfigurationCommand, ConfigurationString } from 'derlib/config/atoms';
import { Result } from 'derlib/config/result';
import { start } from 'derlib/roll20/plugin';
import { Der20Character } from 'derlib/roll20/character';

class PrintCommand extends SelectedTokensCommand {
    handleToken(token: Der20Token): Result.Any {
        let character = token.character;
        let defaultUrl = '';
        if (character !== undefined) {
            character.raw.get('_defaulttoken', (text: string) => {
                // how do we handle this nonsense, because we have to go async for everything now?
                console.log(`${token.id} ${character.id}: ${text}`);
            });
        }
        return new Result.Success(`token ${token.id} ${token.image.url}`);
    }
}

var defaultToken: string;

class SetCommand extends SelectedTokensCommand {
    handleToken(token: Der20Token, parserContext: any, tokenIndex: number): Result.Any {
        let character = token.character;
        if (!character.isNpc) {
            return new Result.Success(`'${character.name}' is not an NPC/Monster and won't be changed`);
        }
        let midnight = new Date();
        midnight.setHours(0, 0, 0, 0);
        let cacheDefeat = `${midnight.valueOf() / 1000}`;
        let anonymousIcon = `${defaultToken}?${cacheDefeat}`;
        let anonymousName = character.attribute('npc_type').get('current');
        if (anonymousName.length > 0) {
            anonymousName = anonymousName.split(/[,(]/)[0];
        } else {
            anonymousName = '';
        }
        token.raw.set({ imgsrc: anonymousIcon, name: anonymousName, showname: true, showplayers_name: true });
        return new Result.Success(`setting token to ${anonymousIcon}, result: ${token.image.url}`);
    }
}

class RevealCommand extends SelectedTokensCommand {
    handleToken(token: Der20Token, context: any, tokenIndex: number): Result.Any {
        let character = token.character;
        if (!character.isNpc) {
            return new Result.Success(`'${character.name}' is not an NPC/Monster and won't be changed`);
        }
        if (context.asyncVariables === undefined) {
            throw new Error('this plugin requires asynchronous retry capability for command execution');
        }
        // because of request fan-out (selected tokens) we may have many images for which we are waiting
        const imageKey = `RevealCommand_image_${tokenIndex}`;
        let imageSource = context.asyncVariables[imageKey];
        if (imageSource === undefined) {
            return new Result.Asynchronous(`loading default token info from ${character.name}`, imageKey, character.imageLoad());
        }
        token.raw.set({ imgsrc: makeImageSourceURL(imageSource.url), name: character.name, showname: true, showplayers_name: true });
        return new Result.Success(`setting token to show its default name and image from ${character.name}`);
    }
}

function makeImageSourceURL(imageSource: string) {
    if (imageSource.includes('?')) {
        return imageSource;
    }
    let midnight = new Date();
    midnight.setHours(0, 0, 0, 0);
    let cacheDefeat = `${midnight.valueOf() / 1000}`;
    return `${imageSource}?${cacheDefeat}`;
}

class CharacterConfiguration extends ConfigurationString {
    parse(line: string, context: any): Result.Any {
        const imageKey = 'CharacterConfiguration_image';
        if (context.asyncVariables === undefined) {
            throw new Error('this plugin requires asynchronous retry capability for command execution');
        }
        let imageSource = context.asyncVariables[imageKey];
        if (imageSource !== undefined) {
            defaultToken = imageSource.url;
            return new Result.Success(`loaded anonymous icon from character '${line}'`);
        }
        let result = super.parse(line);
        if (!result.isSuccess()) {
            return result;
        }
        let source = Der20Character.byName(this.value());
        if (source === undefined) {
            return new Result.Failure(new Error(`plugin requires a character named '${this.value()}' to provide default token`));
        }
        return new Result.Asynchronous('loading default token', imageKey, source.imageLoad());
    }
}

class Configuration {
    // name of a character in the journal that will provide its default token image for anonymous tokens
    character: CharacterConfiguration = new CharacterConfiguration('Anonymous');

    // set the selected tokens as anonymous
    set: SetCommand = new SetCommand();

    // reveal the selected tokens' real identites
    reveal: RevealCommand = new RevealCommand();

    // debug command
    print: PrintCommand = new PrintCommand();
}

start('anonymous', Configuration);
