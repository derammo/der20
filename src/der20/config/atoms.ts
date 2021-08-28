import { ConfigurationStep, ConfigurationValueBase } from 'der20/config/base';
import { ConfigurationTermination, ExportContext, ParserContext } from 'der20/interfaces/parser';
import { Result } from 'der20/interfaces/result';
import { Change, Failure, Success } from 'der20/config/result';
import { ConfigurationValue } from 'der20/interfaces/config';

// no actual data, subclassed by steps that just take an action in code but do parse additional tokens
export abstract class ConfigurationCommand extends ConfigurationStep {
    constructor(format?: string) {
        super(format);
    }

    toJSON(): any {
        return undefined;
    }

    export(_context: ExportContext): void {
        // do not export
    }

    fromJSON(_json: any) {
        // nothing to restore
        return Promise.resolve();
    }
}

// no actual data, subclassed by steps that just take an action without additional tokens
export abstract class ConfigurationSimpleCommand extends ConfigurationCommand implements ConfigurationTermination {
    abstract handleEndOfCommand(context: ParserContext): Promise<Result>;

    parse(_text: string, _context: ParserContext): Promise<Result> {
        // should be just empty string
        return new Success("parsed nothing").resolve(); 
    }
}

export class ConfigurationInteger extends ConfigurationValueBase<number> {
    constructor(defaultValue: number) {
        super(defaultValue, 'INTEGER');
    }

    parse(text: string, context: ParserContext): Promise<Result> {
        if (text.length === 0) {
            this.currentValue = ConfigurationValue.UNSET;
        } else {
            const parsed = parseInt(text, 10);
            if (isNaN(parsed)) {
                return new Failure(new Error(`${text} is not a valid integer`)).resolve();
            }
            this.currentValue = parsed;
        }
        return new Change(`set integer value ${this.currentValue}`).resolve();
    }

    export(context: ExportContext): void {
        if (this.hasConfiguredValue()) {
            context.addRelativeCommand(`${this.currentValue}`);
        }
    }

    clone() {
        let copied = new ConfigurationInteger(this.value());
        return copied;
    }
}

export class ConfigurationFloat extends ConfigurationValueBase<number> {
    constructor(defaultValue: number) {
        super(defaultValue, 'NUMBER');
    }

    parse(text: string, context: ParserContext): Promise<Result> {
        if (text.length === 0) {
            this.currentValue = ConfigurationValue.UNSET;
        } else {
            this.currentValue = parseFloat(text);
        }
        return new Change(`set float value ${this.currentValue}`).resolve();
    }

    export(context: ExportContext): void {
        if (this.hasConfiguredValue()) {
            context.addRelativeCommand(`${this.currentValue}`);
        }
    }

    clone() {
        let copied = new ConfigurationFloat(this.value());
        return copied;
    }
}

export class ConfigurationDate extends ConfigurationValueBase<number> {
    constructor(defaultValue: number) {
        super(defaultValue, 'DATE/HOURS/BLANK');
    }

    parse(text: string, context: ParserContext): Promise<Result> {
        if (text.length === 0) {
            this.currentValue = Date.now();
        } else if (text.match(/^-?[0-9]*\.?[0-9]+$/)) {
            this.currentValue = Date.now() - parseFloat(text) * 60 * 60 * 1000;
        } else {
            this.currentValue = Date.parse(text);
        }
        return new Change(`set date value ${new Date(this.currentValue).toUTCString()}`).resolve();
    }

    export(context: ExportContext): void {
        if (this.hasConfiguredValue()) {
            context.addRelativeCommand(new Date(this.currentValue).toUTCString());
        }
    }

    clone() {
        let copied = new ConfigurationDate(this.value());
        return copied;
    }
}

export class ConfigurationBoolean extends ConfigurationValueBase<boolean> {
    static readonly trueValues = new Set(['true', 'True', 'TRUE', '1']);

    constructor(defaultValue: boolean) {
        super(defaultValue, 'TRUE/FALSE');
    }

    parse(text: string, context: ParserContext): Promise<Result> {
        if (text.length === 0) {
            this.currentValue = ConfigurationValue.UNSET;
        } else {
            this.currentValue = ConfigurationBoolean.trueValues.has(text);
        }
        return new Change(`set boolean value ${this.currentValue}`).resolve();
    }

    export(context: ExportContext): void {
        if (this.hasConfiguredValue()) {
            context.addRelativeCommand(`${this.currentValue}`);
        }
    }

    clone() {
        let copied = new ConfigurationBoolean(this.value());
        return copied;
    }
}
