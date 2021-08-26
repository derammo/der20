import { ConfigurationValueBase } from "der20/config/base";
import { ParserContext, ExportContext } from "der20/interfaces/parser";
import { Result } from "der20/interfaces/result";
import { Change } from "der20/config/result";
import { ConfigurationValue } from "der20/interfaces/config";

export class ConfigurationString extends ConfigurationValueBase<string> {
    constructor(defaultValue: string) {
        super(defaultValue, 'STRING');
    }

    parse(text: string, context: ParserContext): Result {
        if (text.length === 0) {
            this.currentValue = ConfigurationValue.UNSET;
        } else {
            this.currentValue = text;
        }
        return new Change(`set string value '${this.currentValue}'`);
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

