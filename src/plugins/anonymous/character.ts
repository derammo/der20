import { ConfigurationTermination, ConfigurationString, LoaderContext, ParserContext } from 'der20/library';
import { Der20Character } from 'der20/library';
import { setDefaultToken } from './set';
import { Result, Asynchronous, Success, DialogResult, Failure } from 'der20/library';

export class CharacterConfiguration extends ConfigurationString implements ConfigurationTermination {
    handleEndOfCommand(context: ParserContext): Result {
        // no item selected, present a dialog
        let dialog = new context.dialog();
        dialog.addTitle(`Choose a character to provide the anonymous icon:`);
        dialog.addSeparator();
        let names = Der20Character.all().map((character) => { return { label: character.name, result: character.name }; });
        dialog.addSelectionGroup('character', context.rest, names, { command: context.command });
        return new DialogResult(DialogResult.Destination.Caller, dialog.render());
    }

    parse(line: string, context: ParserContext): Result {
        const imageKey = 'CharacterConfiguration_image';
        let imageSource = context.asyncVariables[imageKey];
        if (imageSource !== undefined) {
            setDefaultToken(imageSource.url);
            // XXX we need some way to display this message even if verbose is not set, without introducing a new result type
            return new Success(`loaded anonymous icon from character '${this.value()}'`);
        }
        let result: Result = super.parse(line, context);
        if (!result.isSuccess()) {
            return result;
        }
        let source = Der20Character.byName(this.value());
        if (source === undefined) {
            return new Failure(new Error(`plugin requires a character named '${this.value()}' to provide default token`));
        }
        return new Asynchronous('loading default token', imageKey, source.imageLoad());
    }

    load(json: any, context: LoaderContext) {
        super.load(json, context);
        let source = Der20Character.byName(this.value());
        if (source === undefined) {
            context.addMessage(`plugin requires a character named '${this.value()}' to provide default token`);
            return;
        }
        context.addAsynchronousLoad(source.imageLoad(), (value) => {
            setDefaultToken(value.url);
        });
    }
}
