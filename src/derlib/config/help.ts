import { ConfigurationCommand, ConfigurationStep } from './atoms';
import { ParserContext } from './context';
import { Result } from './result';
import { Der20Dialog } from 'derlib/roll20/dialog';
import { ConfigurationParser } from './parser';
import { Der20Meta, PropertyDecoratorFunction, Validator } from './meta';
import { DefaultConstructed } from '../utility';

// format information such as STRING, INTEGER, etc.
export function format(formatText: string): PropertyDecoratorFunction {
    return function(prototype: any, propertyName: string): void {
        Der20Meta.getOrCreateProperty(prototype, propertyName).format = formatText;
    };
}

// merge documentation for common commands under the given name
export function common(pluginName: string): PropertyDecoratorFunction {
    return function(prototype: any, propertyName: string): void {
        Der20Meta.getOrCreateProperty(prototype, propertyName).common = pluginName;
    };
}

export class HelpCommand extends ConfigurationCommand {
    static readonly command: string = 'help';

    private helpItems: { plugin: string; command: string; format?: string; description?: string; validation?: string; common?: string }[] = [];

    constructor(configurationRoot: any) {
        super();
        this.enumerate('', configurationRoot);
        this.helpItems.sort((left, right) => {
            return left.command.localeCompare(right.command);
        });
    }

    // output for persistence and dump
    toJSON(): any {
        return undefined;
    }

    // output for help generator
    generated(): any {
        return this.helpItems;
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

            let dataFormat = child.format;
            let humanReadable = undefined;
            let sampleConstructor: DefaultConstructed<any> = undefined;
            let validation: Validator = undefined;
            let commonPlugin: string = undefined;

            // may be collection
            if ((<any>child).collectionItem !== undefined) {
                sampleConstructor = (<any>child).collectionItem();
            }

            // consult meta info
            if (Der20Meta.hasProperty(object.constructor.prototype, key)) {
                let meta = Der20Meta.getOrCreateProperty(object.constructor.prototype, key);
                dataFormat = meta.format || dataFormat;
                keyword = meta.keyword || keyword;
                validation = meta.validation;
                commonPlugin = meta.common;
            }

            let command = `${prefix}${keyword}`;
            if (child instanceof ConfigurationStep) {
                if (sampleConstructor !== undefined) {
                    dataFormat = dataFormat || 'ID';
                }
                let validationText = undefined;
                if (validation !== undefined) {
                    validationText = validation.humanReadable;
                }
                this.helpItems.push({
                    plugin: ConfigurationParser.MAGIC_PLUGIN_STRING,
                    command: command,
                    format: dataFormat,
                    description: humanReadable,
                    validation: validationText,
                    common: commonPlugin
                });

                if (sampleConstructor !== undefined && sampleConstructor !== String) {
                    // collection that has editable paths
                    this.enumerate(`${command} [${dataFormat}] `, new sampleConstructor());
                }
            } else {
                this.enumerate(`${command} `, child);
            }
        }
    }

    parse(line: string, context: ParserContext): Result.Any {
        let dialog = new Der20Dialog(`${ConfigurationParser.MAGIC_COMMAND_STRING} `);
        for (let item of this.helpItems) {
            dialog.beginControlGroup();
            if (item.format) {
                dialog.addTextLine(`!${item.plugin} ${item.command} [${item.format}]`);
            } else {
                dialog.addTextLine(`!${item.plugin} ${item.command}`);
            }
            dialog.addIndentedTextLine(`${item.description || ''}`);
            dialog.addIndentedTextLine(`${item.validation || ''}`);
            dialog.endControlGroup();
            dialog.addSeparator();
        }
        return new Result.Dialog(Result.Dialog.Destination.Caller, dialog.render());
    }
}
