import { ConfigurationParsing, ParserContext, ExportContext } from "der20/interfaces/parser";
import { ConfigurationLoading, LoaderContext } from "der20/interfaces/loader";
import { Result } from "der20/interfaces/result";
import { ConfigurationValue } from "der20/interfaces/config";


export abstract class ConfigurationStep implements ConfigurationParsing, ConfigurationLoading {
    constructor(protected format: string) {
        // no code
    }

    abstract parse(text: string, context: ParserContext): Result;
    abstract export(context: ExportContext): void;
    abstract fromJSON(json: any, context: LoaderContext): void;
    abstract toJSON(): any;
}

export abstract class ConfigurationValueBase<T> extends ConfigurationStep implements ConfigurationValue<T> {
    protected currentValue: T = ConfigurationValue.UNSET;

    constructor(public defaultValue: T, format?: string) {
        super(format);
    }

    abstract parse(text: string, context: ParserContext): Result;
    abstract export(context: ExportContext): void;

    fromJSON(json: any, context: LoaderContext) {
        this.currentValue = json;
    }

    value(): T {
        if (!this.hasConfiguredValue()) {
            return this.defaultValue;
        }
        return this.currentValue;
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
        return this.currentValue !== ConfigurationValue.UNSET;
    }

    hasValue(): boolean {
        return this.value() !== ConfigurationValue.UNSET;
    }
    
    clear(): void {
        this.currentValue = ConfigurationValue.UNSET;
    }

    toJSON(): any {
        return this.currentValue;
    }
}