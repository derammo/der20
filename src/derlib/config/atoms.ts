import { DefaultConstructed } from "../utility";

export class ConfigurationStep {
    keyword: string = null;
    parse(line: string) {
        // no code
        return {};
    }
}

export class ConfigurationString extends ConfigurationStep {
    current: string;
    parse(line: string) {
        this.current = line;
        return {};
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
    parse(line: string) {
        this.current = parseInt(line, 10);
        return {};
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

export class ConfigurationBoolean extends ConfigurationStep {
    current: boolean;
    static readonly trueValues = new Set(['true', 'True', 'TRUE', '1']);
    parse(line: string) {
        this.current = (ConfigurationBoolean.trueValues.has(line));
        return {};
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
