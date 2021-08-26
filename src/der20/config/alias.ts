import { ConfigurationCommand } from './atoms';
import { ConfigurationParser } from './parser';
import { ParserContext } from 'der20/interfaces/parser';

export class ConfigurationAlias extends ConfigurationCommand {
    private root: any;
    private path: string;

    constructor(root: any, path: string) {
        super(`-> ${path}`);
        this.root = root;
        this.path = path;
    }

    parse(text: string, context: ParserContext) {
        return ConfigurationParser.parse(`${this.path} ${text}`, this.root, context);
    }
}