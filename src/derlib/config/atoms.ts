import { Result } from './result';
import { ParserContext, ConfigurationParsing, ConfigurationLoading, LoaderContext } from './context';

export abstract class ConfigurationStep<T> implements ConfigurationParsing, ConfigurationLoading {
    protected current: T = ConfigurationStep.NO_VALUE;
    default: T = ConfigurationStep.NO_VALUE;
    format: string;

    constructor(defaultValue: T, format?: string) {
        this.default = defaultValue;
        this.format = format;
    }

    abstract parse(line: string, context: ParserContext): Result.Any;

    load(json: any, context: LoaderContext) {
        this.current = json;
    }

    value(): T {
        if (!this.hasConfiguredValue()) {
            return this.default;
        }
        return this.current;
    }

    // get value(): T {
    //     if (!this.hasConfiguredValue()) {
    //         return this.default;
    //     }
    //     return this.current;
    // }

    // set value(newValue: T) {
    //     this.current = newValue;
    // }

    hasConfiguredValue(): boolean {
        return this.current !== ConfigurationStep.NO_VALUE;
    }

    toJSON(): any {
        return this.current;
    }
}

export namespace ConfigurationStep {
    // this is the value we use for unpopulated data
    export const NO_VALUE: any = undefined;
}

// no actual data, subclassed by steps that just take an action in code
export abstract class ConfigurationCommand extends ConfigurationStep<boolean> {
    constructor() {
        super(ConfigurationStep.NO_VALUE);
    }

    toJSON(): any {
        return undefined;
    }
}

export class ConfigurationString extends ConfigurationStep<string> {
    constructor(defaultValue: string) {
        super(defaultValue, 'STRING');
    }

    parse(line: string, context: ParserContext): Result.Any {
        if (line.length === 0) {
            this.current = ConfigurationStep.NO_VALUE;;
        } else {
            this.current = line;
        }
        return new Result.Change(`set string value '${this.current}'`);
    }

    clone() {
        let copied = new ConfigurationString(this.value());
        return copied;
    }
}

export class ConfigurationInteger extends ConfigurationStep<number> {
    constructor(defaultValue: number) {
        super(defaultValue, 'INTEGER');
    }

    parse(line: string, context: ParserContext): Result.Any {
        if (line.length === 0) {
            this.current = ConfigurationStep.NO_VALUE;
        } else {
            this.current = parseInt(line, 10);
        }
        return new Result.Change(`set integer value ${this.current}`);
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

    parse(line: string, context: ParserContext): Result.Any {
        if (line.length === 0) {
            this.current = ConfigurationStep.NO_VALUE;
        } else {
            this.current = parseFloat(line);
        }
        return new Result.Change(`set float value ${this.current}`);
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

    parse(line: string, context: ParserContext): Result.Any {
        if (line.length === 0) {
            this.current = Date.now();
        } else if (line.match(/^-?[0-9]*\.?[0-9]+$/)) {
            this.current = Date.now() - parseFloat(line) * 60 * 60 * 1000;
        } else {
            this.current = Date.parse(line);
        }
        return new Result.Change(`set date value ${new Date(this.current).toUTCString()}`);
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

    parse(line: string, context: ParserContext): Result.Any {
        if (line.length === 0) {
            this.current = ConfigurationStep.NO_VALUE;
        } else {
            this.current = ConfigurationBoolean.trueValues.has(line);
        }
        return new Result.Change(`set boolean value ${this.current}`);
    }

    clone() {
        let copied = new ConfigurationBoolean(this.value());
        return copied;
    }
}

export interface CollectionItem {
    id: string;
    name: ConfigurationString;
}

export interface Collection {
    removeItem(id: string): boolean;
}
