import { ConfigurationStep } from './atoms';
import { ConfigurationParser } from './parser';

export class ConfigurationAlias extends ConfigurationStep {
    root: any;
    path: string;

    constructor(root: any, path: string) {
        super();
        this.root = root;
        this.path = path;
    }

    toJSON() {
        return undefined;
    }

    parse(line: string) {
        return ConfigurationParser.parse(`${this.path} ${line}`, this.root);
    }
}