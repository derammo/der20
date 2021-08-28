import { ConfigurationTermination, ConfigurationString, LoaderContext, ParserContext } from 'der20/library';
import { Der20Character } from 'der20/library';
import { setDefaultToken } from './set';
import { Result, Success, DialogResult } from 'der20/library';
import { Der20CharacterImage } from 'der20/library';
import { ConfigurationContext } from 'der20/library';

export class CharacterConfiguration extends ConfigurationString implements ConfigurationTermination {
    handleEndOfCommand(context: ParserContext): Promise<Result> {
        // no item selected, present a dialog
        let dialog = new context.dialog();
        dialog.addTitle(`Choose a character to provide the anonymous icon:`);
        dialog.addSeparator();
        let names = Der20Character.all().map((character) => { return { label: character.name, result: character.name }; });
        dialog.addSelectionGroup('character', context.rest, names, { command: context.command });
        return new DialogResult(DialogResult.Destination.caller, dialog.render()).resolve();
    }

    parse(text: string, context: ParserContext): Promise<Result> {
        return super.parse(text, context)
            .then((result: Result) => {
                context.swapIn();
                if (!result.isSuccess()) {
                    return result;
                }
                return this.imageLoad(context)
                    .then((loaded: Der20CharacterImage) => this.installImage(context, loaded))
                    .then(() => { 
                        context.swapIn();
                        // XXX we need some way to display this message even if verbose is not set, without introducing a new result type
                        return new Success(`loaded anonymous icon from character '${this.value()}'`);
                    });            
            });
    }

    fromJSON(json: any, context: LoaderContext): Promise<void> {
        return super.fromJSON(json, context)
            .then(() => this.imageLoad(context))
            .then((loaded: Der20CharacterImage) => this.installImage(context, loaded));
    }

    imageLoad(context: ConfigurationContext): Promise<Der20CharacterImage> {
        context.swapIn();
        let source = Der20Character.byName(this.value());
        if (source === undefined) {
            debug.log(`plugin requires a character named '${this.value()}' to provide default token`);
            return undefined;
        }
        return source.imageLoad();
    }   

    installImage(context: ConfigurationContext, image: Der20CharacterImage) {
        context.swapIn();
        if (image !== undefined) {
            setDefaultToken(image.url);
        }
        return Promise.resolve();
    }
}
