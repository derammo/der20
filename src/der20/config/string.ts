import { ConfigurationStep } from "der20/config/base";
import { ParserContext } from "der20/interfaces/parser";
import { Result } from "der20/interfaces/result";
import { Change } from "der20/config/result";
import { ConfigurationValue } from "der20/interfaces/config";

export class ConfigurationString extends ConfigurationStep<string> {
    constructor(defaultValue: string) {
        super(defaultValue, 'STRING');
    }

    parse(line: string, context: ParserContext): Result {
        if (line.length === 0) {
            this.current = ConfigurationValue.UNSET;;
        } else {
            this.current = line;
        }
        return new Change(`set string value '${this.current}'`);
    }

    clone() {
        let copied = new ConfigurationString(this.value());
        return copied;
    }
}

