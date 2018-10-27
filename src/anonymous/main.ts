import { Der20Token, SelectedTokensCommand } from 'derlib/roll20/token';
import { ConfigurationCommand } from 'derlib/config/atoms';
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
        return new Result.Success(`token ${token.id} ${token.image.url}`)
    }
}

var defaultToken: string;
on ('ready', () => {
    // XXX hack: use config instead
    let source = Der20Character.byName('Anonymous');
    if (source === undefined) {
        console.log(`plugin requires a character named 'Anonymous' to provide default token; this is a temporary hack`);
        return;
    }
    source.imageLoad()
        .then((image) => {
            defaultToken = image.url;
        });
});

class SetCommand extends SelectedTokensCommand {
    handleToken(token: Der20Token, parserContext: any, tokenIndex: number): Result.Any {
        let character = token.character;
        if (!character.isNpc) {
            return new Result.Success(`'${character.name}' is not an NPC/Monster and won't be changed`);
        }
        let midnight = new Date();
        midnight.setHours(0,0,0,0); 
        let cacheDefeat = `${midnight.valueOf() / 1000}`;
        let anonymousIcon = `${defaultToken}?${cacheDefeat}`;
        let anonymousName = character.attribute('npc_type').get('current');
        if (anonymousName.length > 0) {
            anonymousName = anonymousName.split(/[,(]/)[0]
        } else {
            anonymousName = ''
        }
        token.raw.set({imgsrc: anonymousIcon, name: anonymousName, showname: true, showplayers_name: true});
        return new Result.Success(`setting token ${token.id} to ${anonymousIcon}, result: ${token.image.url}`)
    }
}

class RevealCommand extends SelectedTokensCommand {
    handleToken(token: Der20Token, parserContext: any, tokenIndex: number): Result.Any {
        let character = token.character;
        if (!character.isNpc) {
            return new Result.Success(`'${character.name}' is not an NPC/Monster and won't be changed`);
        }
        if (parserContext.asyncVariables === undefined) {
            throw new Error('this plugin requires asynchronous retry capability for command execution');
        }
        // because of request fan-out (selected tokens) we may have many images for which we are waiting
        let urlKey = `RevealCommand_image_${tokenIndex}`;
        let imageSource = parserContext.asyncVariables[urlKey];
        if (imageSource === undefined) {
            return new Result.Asynchronous(`loading default token info for ${token.id} from ${character.name}`, urlKey, character.imageLoad());
        }
        token.raw.set({imgsrc: makeImageSourceURL(imageSource.url), name: character.name, showname: true, showplayers_name: true});
        return new Result.Success(`setting token ${token.id} to show its default name and image from ${character.name}`);
    }
}

function makeImageSourceURL(imageSource: string) {
    if (imageSource.includes('?')) {
        return;
    }
    let midnight = new Date();
    midnight.setHours(0,0,0,0); 
    let cacheDefeat = `${midnight.valueOf() / 1000}`;
    return `${imageSource}?${cacheDefeat}`;
}

class Configuration {
    print: PrintCommand = new PrintCommand();
    set: SetCommand = new SetCommand();
    reveal: RevealCommand = new RevealCommand();
}

start('anonymous', Configuration);

