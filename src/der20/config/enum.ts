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

    parse(text: string, context: ParserContext): Promise<Result> {
        if ((text.length !== 0) && (!this.valid.has(text))) {
            return new Failure(new Error(`'${text}' is not a valid value of enumeration '${Array.from(this.valid.values())}'`)).resolve();
        }
        return super.parse(text, context);
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