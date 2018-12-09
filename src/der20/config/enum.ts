import { ConfigurationString } from "der20/config/string";
import { ParserContext } from "der20/interfaces/parser";
import { Failure } from "./result";
import { Result } from "der20/interfaces/result";

export class ConfigurationEnumerated extends ConfigurationString {
    private valid: Set<string>;

    constructor(defaultValue: string, valid: string[]) {
        super(defaultValue);
        this.valid = new Set<string>(valid);
        this.format = Array.from(this.valid.values()).join('|');
    }

    parse(line: string, context: ParserContext): Result {
        if ((line.length !== 0) && (!this.valid.has(line))) {
            return new Failure(new Error(`'${line}' is not a valid value of enumeration '${Array.from(this.valid.values())}'`))
        }
        return super.parse(line, context);
    }

    choices(): string[] {
        let values = Array.from(this.valid.values());
        values.sort();
        values.unshift('');
        return values;
    }

    setChoices(choices: string[]): void {
        this.valid = new Set(choices);
    }
}