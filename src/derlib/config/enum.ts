import { ConfigurationString } from "./atoms";
import { ParserContext } from "./context";
import { Result } from "./result";

export class ConfigurationEnumerated extends ConfigurationString {
    private valid: Set<string>;

    constructor(defaultValue: string, valid: string[]) {
        super(defaultValue);
        this.valid = new Set<string>(valid);
        this.format = Array.from(this.valid.values()).join('|');
    }

    parse(line: string, context: ParserContext): Result.Any {
        if ((line.length !== 0) && (!this.valid.has(line))) {
            return new Result.Failure(new Error(`'${line}' is not a valid value of enumeration '${Array.from(this.valid.values())}'`))
        }
        return super.parse(line, context);
    }

    choices(): string[] {
        let values = Array.from(this.valid.values());
        values.sort();
        values.unshift('');
        return values;
    }
}