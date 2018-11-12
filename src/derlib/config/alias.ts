import { ConfigurationCommand } from './atoms';
import { ConfigurationParser } from './parser';
import { ParserContext } from './context';

export class ConfigurationAlias extends ConfigurationCommand {
    root: any;
    path: string;

    constructor(root: any, path: string) {
        super();
        this.root = root;
        this.path = path;
        this.format = `-> ${path}`;
    }

    parse(line: string, context: ParserContext) {
        return ConfigurationParser.parse(`${this.path} ${line}`, this.root, context);
    }
}