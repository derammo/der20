import { ConfigurationValueBase } from "der20/config/base";
import { Change } from "der20/config/result";
import { ConfigurationValue } from "der20/interfaces/config";
import { ExportContext, ParserContext } from "der20/interfaces/parser";
import { Result } from "der20/interfaces/result";

export class ConfigurationString extends ConfigurationValueBase<string> {
    constructor(defaultValue: string) {
        super(defaultValue, 'STRING');
    }

    parse(text: string, context: ParserContext): Promise<Result> {
        if (text.length === 0) {
            this.currentValue = ConfigurationValue.UNSET;
        } else {
            this.currentValue = text;
        }
        return new Change(`set string value '${this.currentValue}'`).resolve();
    }

    export(context: ExportContext): void {
        if (this.hasConfiguredValue()) {
            context.addRelativeCommand(this.currentValue);
        }
    }

    clone() {
        let copied = new ConfigurationString(this.value());
        return copied;
    }
}

