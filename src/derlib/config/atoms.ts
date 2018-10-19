import { DefaultConstructed } from "../utility";
import { Result } from "./result";

export class ConfigurationStep {
    keyword: string = null;
    parse(line: string): Result.Any {
        // no code
        return new Result.Success();
    }
}

export class ConfigurationString extends ConfigurationStep {
    current: string;
    parse(line: string): Result.Any {
        this.current = line;
        return new Result.Success();
    }

    toJSON() {
        return this.current;
    }

    clone() {
        let copied = new ConfigurationString();
        copied.current = this.current;
        return copied;
    }
}

export class ConfigurationInteger extends ConfigurationStep {
    current: number;

    parse(line: string): Result.Any {
        this.current = parseInt(line, 10);
        return new Result.Success();
    }

    toJSON() {
        return this.current;
    }

    clone() {
        let copied = new ConfigurationInteger();
        copied.current = this.current;
        return copied;
    }
}

export class ConfigurationDate extends ConfigurationStep {
    current: number;

    parse(line: string): Result.Any {
        let checkFloat = line.match(/^-?[0-9]*\.?[0-9]+$/);
        if (checkFloat) {
            this.current = Date.now() - (parseFloat(line) * 60 * 60 * 1000);
        } else {
            this.current = Date.parse(line);
        }
        return new Result.Success();
    }

    toJSON() {
        return this.current;
    }

    clone() {
        let copied = new ConfigurationDate();
        copied.current = this.current;
        return copied;
    }
}

export class ConfigurationBoolean extends ConfigurationStep {
    current: boolean;
    static readonly trueValues = new Set(['true', 'True', 'TRUE', '1']);
    parse(line: string): Result.Any {
        this.current = (ConfigurationBoolean.trueValues.has(line));
        return new Result.Success();
    }

    toJSON() {
        return this.current;
    }

    clone() {
        let copied = new ConfigurationBoolean();
        copied.current = this.current;
        return copied;
    }
}

export interface CollectionItem {
    id: string;
}
