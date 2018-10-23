import { DefaultConstructed } from '../utility';
import { Result } from './result';

export class ConfigurationStep<T> {
    keyword: string = ConfigurationStep.NO_VALUE;
    current: T = ConfigurationStep.NO_VALUE;
    default: T = ConfigurationStep.NO_VALUE;

    constructor(defaultValue: T) {
        this.default = defaultValue;
    }

    parse(line: string): Result.Any {
        return new Result.Success();
    }

    load(json: any) {
        this.current = json;
    }

    value(): T {
        if (!this.hasConfiguredValue()) {
            return this.default;
        }
        return this.current;
    }

    hasConfiguredValue(): boolean {
        return this.current !== ConfigurationStep.NO_VALUE;
    }

    toJSON(): any {
        return this.current;
    }
}

export namespace ConfigurationStep {
    // this is the value we use for unpopulated data
    export const NO_VALUE = undefined;
}

// no actual data, subclassed by steps that just take an action in code
export class ConfigurationCommand extends ConfigurationStep<boolean> {
    constructor() {
        super(ConfigurationStep.NO_VALUE);
    }
}

export class ConfigurationString extends ConfigurationStep<string> {
    constructor(defaultValue: string) {
        super(defaultValue);
    }

    parse(line: string): Result.Any {
        this.current = line;
        return new Result.Change();
    }

    clone() {
        let copied = new ConfigurationString(this.current);
        return copied;
    }
}

export class ConfigurationInteger extends ConfigurationStep<number> {
    constructor(defaultValue: number) {
        super(defaultValue);
    }

    parse(line: string): Result.Any {
        if (line.length === 0) {
            this.current = ConfigurationStep.NO_VALUE;
        } else {
            this.current = parseInt(line, 10);
        }
        return new Result.Change();
    }

    clone() {
        let copied = new ConfigurationInteger(this.current);
        return copied;
    }
}

export class ConfigurationFloat extends ConfigurationStep<number> {
    constructor(defaultValue: number) {
        super(defaultValue);
    }

    parse(line: string): Result.Any {
        if (line.length === 0) {
            this.current = ConfigurationStep.NO_VALUE;
        } else {
            this.current = parseFloat(line);
        }
        return new Result.Change();
    }

    clone() {
        let copied = new ConfigurationFloat(this.current);
        return copied;
    }
}

export class ConfigurationDate extends ConfigurationStep<number> {
    constructor(defaultValue: number) {
        super(defaultValue);
    }

    parse(line: string): Result.Any {
        if (line.length === 0) {
            this.current = Date.now();
        } else if (line.match(/^-?[0-9]*\.?[0-9]+$/)) {
            this.current = Date.now() - parseFloat(line) * 60 * 60 * 1000;
        } else {
            this.current = Date.parse(line);
        }
        return new Result.Change();
    }

    clone() {
        let copied = new ConfigurationDate(this.current);
        return copied;
    }
}

export class ConfigurationBoolean extends ConfigurationStep<boolean> {
    static readonly trueValues = new Set(['true', 'True', 'TRUE', '1']);

    constructor(defaultValue: boolean) {
        super(defaultValue);
    }

    parse(line: string): Result.Any {
        if (line.length === 0) {
            this.current = ConfigurationStep.NO_VALUE;
        } else {
            this.current = ConfigurationBoolean.trueValues.has(line);
        }
        return new Result.Change();
    }

    clone() {
        let copied = new ConfigurationBoolean(this.current);
        return copied;
    }
}

export interface CollectionItem {
    id: string;
}
