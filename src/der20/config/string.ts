import { ConfigurationStep } from "der20/config/base";
import { ParserContext, ExportContext } from "der20/interfaces/parser";
import { Result } from "der20/interfaces/result";
import { Change } from "der20/config/result";
import { ConfigurationValue } from "der20/interfaces/config";

export class ConfigurationString extends ConfigurationStep<string> {
    constructor(defaultValue: string) {
        super(defaultValue, 'STRING');
    }

    parse(text: string, context: ParserContext): Result {
        if (text.length === 0) {
            this.current = ConfigurationValue.UNSET;
        } else {
            this.current = text;
        }
        return new Change(`set string value '${this.current}'`);
    }

    export(context: ExportContext): void {
        if (this.hasConfiguredValue()) {
            context.addRelativeCommand(this.current);
        }
    }

    clone() {
        let copied = new ConfigurationString(this.value());
        return copied;
    }
}

