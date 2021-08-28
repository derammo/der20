import { ConfigurationParsing, ParserContext, ExportContext } from "der20/interfaces/parser";
import { ConfigurationLoading, LoaderContext } from "der20/interfaces/loader";
import { Result } from "der20/interfaces/result";
import { ConfigurationValue } from "der20/interfaces/config";


export abstract class ConfigurationStep implements ConfigurationParsing, ConfigurationLoading {
    constructor(protected format: string) {
        // no code
    }

    abstract parse(text: string, context: ParserContext): Promise<Result>;
    abstract export(context: ExportContext): void;
    abstract fromJSON(json: any, context: LoaderContext): Promise<void>;
    abstract toJSON(): any;
}

export abstract class ConfigurationValueBase<T> extends ConfigurationStep implements ConfigurationValue<T> {
    protected currentValue: T = ConfigurationValue.UNSET;

    constructor(public defaultValue: T, format?: string) {
        super(format);
    }

    abstract parse(text: string, context: ParserContext): Promise<Result>;
    abstract export(context: ExportContext): void;

    fromJSON(json: any, _context: LoaderContext): Promise<void> {
        this.currentValue = json;
        return Promise.resolve();
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
    //     return this.currentValue;
    // }

    // set value(newValue: T) {
    //     this.currentValue = newValue;
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