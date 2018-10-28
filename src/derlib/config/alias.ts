import { ConfigurationCommand } from './atoms';
import { ConfigurationParser } from './parser';

export class ConfigurationAlias extends ConfigurationCommand {
    root: any;
    path: string;

    constructor(root: any, path: string) {
        super();
        this.root = root;
        this.path = path;
    }

    toJSON(): any {
        return undefined;
    }

    parse(line: string) {
        return ConfigurationParser.parse(`${this.path} ${line}`, this.root);
    }
}