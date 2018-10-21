import { DefaultConstructed } from "../utility";
import { Result } from "./result";

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

    effectiveValue(): T {
        if (!this.hasValue()) {
            return this.default;
        }
        return this.current;
    }
    
    hasValue(): boolean {
        return this.current !== ConfigurationStep.NO_VALUE;
    }

    toJSON() {
        return this.current;
    }
}

export namespace ConfigurationStep {
    // this is the value we use for unpopulated data
    export const NO_VALUE = null;
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
        // XXX load or default
    }

    parse(line: string): Result.Any {
        this.current = line;
        // XXX write
        return new Result.Success();
    }

    clone() {
        let copied = new ConfigurationString(this.current);
        return copied;
    }
}

export class ConfigurationInteger extends ConfigurationStep<number> {
    constructor(defaultValue: number) {
        super(defaultValue);
        // XXX load or default
    }

    parse(line: string): Result.Any {
        this.current = parseInt(line, 10);
        // XXX write
        return new Result.Success();
    }

    clone() {
        let copied = new ConfigurationInteger(this.current);
        return copied;
    }
}

export class ConfigurationFloat extends ConfigurationStep<number> {
    constructor(defaultValue: number) {
        super(defaultValue);
        // XXX load or default
    }

    parse(line: string): Result.Any {
        this.current = parseFloat(line);
        // XXX write
        return new Result.Success();
    }

    clone() {
        let copied = new ConfigurationFloat(this.current);
        return copied;
    }
}

export class ConfigurationDate extends ConfigurationStep<number> {
    constructor(defaultValue: number) {
        super(defaultValue);
        // XXX load or default
    }

    parse(line: string): Result.Any {
        let checkFloat = line.match(/^-?[0-9]*\.?[0-9]+$/);
        if (checkFloat) {
            this.current = Date.now() - (parseFloat(line) * 60 * 60 * 1000);
        } else {
            this.current = Date.parse(line);
        }
        return new Result.Success();
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
        // XXX load or default
    }

    parse(line: string): Result.Any {
        this.current = (ConfigurationBoolean.trueValues.has(line));
        // XXX write
        return new Result.Success();
    }

    clone() {
        let copied = new ConfigurationBoolean(this.current);
        return copied;
    }
}

export interface CollectionItem {
    id: string;
}
