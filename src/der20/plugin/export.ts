import { ConfigurationCommand } from "der20/config/atoms";
import { ParserContext, ExportContext } from "der20/interfaces/parser";
import { Result } from "der20/interfaces/result";
import { ConfigurationParser } from 'der20/config/parser';
import { Failure, DialogResult } from "der20/config/result";
import { Tokenizer } from "der20/config/tokenizer";
import { ContextBase, ContextHost } from "der20/plugin/context_base";

class ExportContextImpl extends ContextBase implements ExportContext {
    commands: string[] = [];
    prefixStack: string[] = [];

    push(token: string): void {
        // REVISIT: arbitrary limit
        if (this.prefixStack.length > 255) {
            throw new Error('infinite loop detected in export traversal');
        }
        this.prefixStack.push(token);
    }
    pop(): string {
        return this.prefixStack.pop();
    }
    prefix(): string {
        return this.prefixStack.join(' ');
    }
    addCommand(line: string): void {
        this.commands.push(line);
    }
    addRelativeCommand(rest: string): void {
        this.addCommand(this.prefixStack.concat(rest).join(' '));
    }
}

export class ConfigurationExportCommand extends ConfigurationCommand {
    constructor(private parent: ContextHost, private configurationRoot: any) {
        super();
    }

    parse(text: string, context: ParserContext): Promise<Result> {
        // context to track path from root and accumulate commands
        const exportContext = new ExportContextImpl(this.parent, this.configurationRoot.options);
        exportContext.push(`!${context.command}`);

        // walk any tokens specified after 'export' command
        const tokens = Tokenizer.tokenize(text);
        let walk = this.configurationRoot;
        for (let token of tokens) {
            if (token === undefined) {
                continue;
            }
            token = token.trim();
            if (token.length < 1) {
                continue;
            }
            const route = ConfigurationParser.route(token, walk);
            let next;
            if (route !== undefined) {
                next = route.target;
            } else {
                // check for collection support
                if (typeof walk.fetchItem === 'function') {
                    next = walk.fetchItem(token);
                }
            }
            if (next === undefined) {
                return new Failure(new Error(`'${token}' is not a valid step in the export path`)).resolve();
            }
            walk = next;
            exportContext.push(token);
        }

        // recursively dump all the commands
        ConfigurationParser.export(walk, exportContext);

        // emit list of all commands as minimal html that can be sent in one message and imports ok into handouts
        return new DialogResult(DialogResult.Destination.caller, `<div>${exportContext.commands.join('<br>')}</div>`).resolve();
    }
}