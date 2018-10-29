import { ConfigurationCommand, ConfigurationStep } from "./atoms";
import { ParserContext } from "./context";
import { Result } from "./result";
import { Der20Dialog } from "../roll20/dialog";
import { ConfigurationParser } from "./parser";

export class HelpCommand extends ConfigurationCommand {
    static readonly command: string = 'help';

    private helpItems: { command: string, help?: string }[] = [];

    constructor(configurationRoot: any) {
        super();
        this.enumerate(ConfigurationParser.MAGIC_COMMAND_STRING, configurationRoot);
        this.helpItems.sort((left, right) => { return left.command.localeCompare(right.command) });
    }

    enumerate(prefix: string, object: any) {
        if (prefix.length > 200) {
            return;
        }
        for (let key of Object.getOwnPropertyNames(object)) {
            // REVISIT: interrogate for help? consult a separate document so we don't pollute code? annotations?
            let keyword = key;
            const child: any = object[key];
            if (child === undefined) {
                continue;
            }
            if (child === null) {
                continue;
            }
            if (typeof child !== 'object') {
                // cannot enumerate these safely
                continue;
            }
            if (Array.isArray(child)) {
                // cannot enumerate these safely
                continue;
            }
            if (child.hasOwnProperty('keyword')) {
                keyword = child.keyword || key;
            }
            let command = `${prefix} ${keyword}`;
            if (child instanceof ConfigurationStep) {
                // may have collection
                if ((<any>child).collectionItem !== undefined) {
                    let item = (<any>child).collectionItem.call(child);
                    command = `${command} [ID]`;
                    if (item === undefined) {
                        // collection that only selects 
                        this.helpItems.push({ command: command });
                    } else {
                        // collection that has editable paths
                        this.enumerate(command, item);
                    }
                } else {
                    this.helpItems.push({ command: command, help: child.help });
                }
            } else {
                this.enumerate(command, child);
            }
        }
    }

    parse(line: string, context: ParserContext): Result.Any {
        let dialog = new Der20Dialog(`${ConfigurationParser.MAGIC_COMMAND_STRING} `);
        dialog.beginControlGroup();
        for (let item of this.helpItems) {
            if (item.help) {
                dialog.addTextLine(`${item.command} [${item.help}]`);
            } else {
                dialog.addTextLine(`${item.command}`);
            }
        }
        dialog.endControlGroup();
        return new Result.Dialog(Result.Dialog.Destination.Caller, dialog.render());

    }
}