import { ConfigurationCommand } from './atoms';
import { ConfigurationParser } from './parser';
import { ParserContext } from 'der20/interfaces/parser';

export class ConfigurationAlias extends ConfigurationCommand {
    root: any;
    path: string;

    constructor(root: any, path: string) {
        super();
        this.root = root;
        this.path = path;
        this.format = `-> ${path}`;
    }

    parse(text: string, context: ParserContext) {
        return ConfigurationParser.parse(`${this.path} ${text}`, this.root, context);
    }
}