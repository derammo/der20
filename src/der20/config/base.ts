import { ConfigurationParsing, ParserContext } from "der20/interfaces/parser";
import { ConfigurationLoading, LoaderContext } from "der20/interfaces/loader";
import { Result } from "der20/interfaces/result";
import { ConfigurationValue } from "der20/interfaces/config";

export abstract class ConfigurationStep<T> implements ConfigurationParsing, ConfigurationLoading, ConfigurationValue<T> {
    protected current: T = ConfigurationValue.UNSET;
    default: T = ConfigurationValue.UNSET;
    format: string;

    constructor(defaultValue: T, format?: string) {
        this.default = defaultValue;
        this.format = format;
    }

    abstract parse(line: string, context: ParserContext): Result;

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
        return this.current !== ConfigurationValue.UNSET;
    }

    toJSON(): any {
        return this.current;
    }
}