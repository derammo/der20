import { ConfigurationString } from 'derlib/config/atoms';
import { Result } from 'derlib/config/result';
import { Der20Character } from 'derlib/roll20/character';
import { ParserContext, LoaderContext } from 'derlib/config/context';
import { setDefaultToken } from './set';

export class CharacterConfiguration extends ConfigurationString {
    parse(line: string, context: ParserContext): Result.Any {
        const imageKey = 'CharacterConfiguration_image';
        let imageSource = context.asyncVariables[imageKey];
        if (imageSource !== undefined) {
            setDefaultToken(imageSource.url);
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
