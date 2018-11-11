import { ConfigurationString } from 'derlib/config/atoms';
import { Result } from 'derlib/config/result';
import { Der20Character } from 'derlib/roll20/character';
import { ParserContext, LoaderContext, ConfigurationTermination } from 'derlib/config/context';
import { setDefaultToken } from './set';

export class CharacterConfiguration extends ConfigurationString implements ConfigurationTermination {
    handleEndOfCommand(context: ParserContext): Result.Any {
        // no item selected, present a dialog
        let dialog = new context.dialog(`${context.command} `);
        dialog.addTitle(`Choose a character to provide the anonymous icon:`);
        dialog.addSeparator();
        let names = Der20Character.all().map((character) => { return { label: character.name, result: character.name }; });
        dialog.addSelectionGroup('character', context.rest, names);
        return new Result.Dialog(Result.Dialog.Destination.Caller, dialog.render());
    }

    parse(line: string, context: ParserContext): Result.Any {
        const imageKey = 'CharacterConfiguration_image';
        let imageSource = context.asyncVariables[imageKey];
        if (imageSource !== undefined) {
            setDefaultToken(imageSource.url);
            // XXX we need some way to display this message even if verbose is not set, without introducing a new result type
            return new Result.Change(`loaded anonymous icon from character '${this.value()}'`);
        }
        let result: Result.Any = super.parse(line, context);
        if (!result.isSuccess()) {
            return result;
        }
        let source = Der20Character.byName(this.value());
        if (source === undefined) {
            return new Result.Failure(new Error(`plugin requires a character named '${this.value()}' to provide default token`));
        }
        return new Result.Asynchronous('loading default token', imageKey, source.imageLoad());
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
