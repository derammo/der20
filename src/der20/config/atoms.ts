import { ConfigurationStep } from 'der20/config/base';
import { ParserContext, ConfigurationTermination, ExportContext } from 'der20/interfaces/parser';
import { Result } from 'der20/interfaces/result';
import { Change, Failure } from 'der20/config/result';
import { ConfigurationValue } from 'der20/interfaces/config';

// no actual data, subclassed by steps that just take an action in code but do parse additional tokens
export abstract class ConfigurationCommand extends ConfigurationStep<boolean> {
    constructor() {
        super(ConfigurationValue.UNSET);
    }

    toJSON(): any {
        return undefined;
    }

    export(context: ExportContext): void {
        // do not export
    }
}

// no actual data, subclassed by steps that just take an action without additional tokens
export abstract class ConfigurationSimpleCommand implements ConfigurationTermination {
    abstract handleEndOfCommand(context: ParserContext): Result;

    toJSON(): any {
        return undefined;
    }

    export(context: ExportContext): void {
        // do not export
    }
}

export class ConfigurationInteger extends ConfigurationStep<number> {
    constructor(defaultValue: number) {
        super(defaultValue, 'INTEGER');
    }

    parse(text: string, context: ParserContext): Result {
        if (text.length === 0) {
            this.current = ConfigurationValue.UNSET;
        } else {
            const parsed = parseInt(text, 10);
            if (isNaN(parsed)) {
                return new Failure(new Error(`${text} is not a valid integer`));
            }
            this.current = parsed;
        }
        return new Change(`set integer value ${this.current}`);
    }

    export(context: ExportContext): void {
        if (this.hasConfiguredValue()) {
            context.addRelativeCommand(`${this.current}`);
        }
    }

    clone() {
        let copied = new ConfigurationInteger(this.value());
        return copied;
    }
}

export class ConfigurationFloat extends ConfigurationStep<number> {
    constructor(defaultValue: number) {
        super(defaultValue, 'NUMBER');
    }

    parse(text: string, context: ParserContext): Result {
        if (text.length === 0) {
            this.current = ConfigurationValue.UNSET;
        } else {
            this.current = parseFloat(text);
        }
        return new Change(`set float value ${this.current}`);
    }

    export(context: ExportContext): void {
        if (this.hasConfiguredValue()) {
            context.addRelativeCommand(`${this.current}`);
        }
    }

    clone() {
        let copied = new ConfigurationFloat(this.value());
        return copied;
    }
}

export class ConfigurationDate extends ConfigurationStep<number> {
    constructor(defaultValue: number) {
        super(defaultValue, 'DATE/HOURS/BLANK');
    }

    parse(text: string, context: ParserContext): Result {
        if (text.length === 0) {
            this.current = Date.now();
        } else if (text.match(/^-?[0-9]*\.?[0-9]+$/)) {
            this.current = Date.now() - parseFloat(text) * 60 * 60 * 1000;
        } else {
            this.current = Date.parse(text);
        }
        return new Change(`set date value ${new Date(this.current).toUTCString()}`);
    }

    export(context: ExportContext): void {
        if (this.hasConfiguredValue()) {
            context.addRelativeCommand(new Date(this.current).toUTCString());
        }
    }

    clone() {
        let copied = new ConfigurationDate(this.value());
        return copied;
    }
}

export class ConfigurationBoolean extends ConfigurationStep<boolean> {
    static readonly trueValues = new Set(['true', 'True', 'TRUE', '1']);

    constructor(defaultValue: boolean) {
        super(defaultValue, 'TRUE/FALSE');
    }

    parse(text: string, context: ParserContext): Result {
        if (text.length === 0) {
            this.current = ConfigurationValue.UNSET;
        } else {
            this.current = ConfigurationBoolean.trueValues.has(text);
        }
        return new Change(`set boolean value ${this.current}`);
    }

    export(context: ExportContext): void {
        if (this.hasConfiguredValue()) {
            context.addRelativeCommand(`${this.current}`);
        }
    }

    clone() {
        let copied = new ConfigurationBoolean(this.value());
        return copied;
    }
}
