export class ConfigurationStep {
    keyword: string = null;
    parse(line: string) {
        // no code
    }
}

export class ConfigurationString extends ConfigurationStep {
    current: string;
    parse(line: string) {
        this.current = line;
    }

    public toJSON() {
        return this.current;
    }
}

export class ConfigurationInteger extends ConfigurationStep {
    current: number;
    parse(line: string) {
        this.current = parseInt(line, 10);
    }

    public toJSON() {
        return this.current;
    }
}

export class ConfigurationBoolean extends ConfigurationStep {
    current: boolean;
    static readonly trueValues = new Set(['true', 'True', 'TRUE', '1']);
    parse(line: string) {
        this.current = (ConfigurationBoolean.trueValues.has(line));
    }

    public toJSON() {
        return this.current;
    }
}

export interface CollectionItem {
    id: string;
}
