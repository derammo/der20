import { ConfigurationSimpleCommand } from './atoms';
import { Der20Meta, PropertyDecoratorFunction, Validator } from './meta';
import { DefaultConstructed } from 'der20/common/utility';
import { ConfigurationStep } from 'der20/config/base';
import { ParserContext } from "der20/interfaces/parser";
import { Result } from 'der20/interfaces/result';
import { DialogResult } from 'der20/config/result';

/**
 * decorator: format information such as STRING, INTEGER, etc.
 */
export function format(formatText: string): PropertyDecoratorFunction {
    return function(prototype: any, propertyName: string): void {
        Der20Meta.getOrCreateProperty(prototype, propertyName).format = formatText;
    };
}

/**
 * decorator: merge documentation for common commands under the given name
 */
 export function common(pluginName: string): PropertyDecoratorFunction {
    return function(prototype: any, propertyName: string): void {
        Der20Meta.getOrCreateProperty(prototype, propertyName).common = pluginName;
    };
}

export class HelpCommand extends ConfigurationSimpleCommand {
    static readonly command: string = 'help';

    private helpItems: { plugin: string; command: string; format?: string; validation?: string; common?: string }[] = [];

    constructor(private pluginName: string, configurationRoot: any) {
        super();
        this.enumerate('', configurationRoot);
        this.helpItems.sort((left, right) => {
            return left.command.localeCompare(right.command);
        });
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
            let sampleConstructor: DefaultConstructed<any> = undefined;
            let validation: Validator = undefined;
            let commonPlugin: string = undefined;

            if ((<any>child).collectionItem !== undefined) {
                // collection, so we have to create a sample object to enumerate for child properties
                sampleConstructor = (<any>child).collectionItem();
            }

            if (Der20Meta.hasProperty(object.constructor.prototype, key)) {
                // consult meta info
                let meta = Der20Meta.getOrCreateProperty(object.constructor.prototype, key);
                if (!meta.config) {
                    // no help generation
                    continue;
                }
                dataFormat = meta.format || dataFormat;
                keyword = meta.keyword || keyword;
                validation = meta.validation;
                commonPlugin = meta.common;
            } else {
                // no help generation
                continue;
            }

            let command = `${prefix}${keyword}`;
            if (child instanceof ConfigurationStep) {
                if (sampleConstructor !== undefined) {
                    // configuration step that implements collection
                    dataFormat = dataFormat || 'ID';
                }
                let validationText = undefined;
                if (validation !== undefined) {
                    validationText = validation.humanReadable;
                }
                this.helpItems.push({
                    plugin: this.pluginName,
                    command: command,
                    format: dataFormat,
                    validation: validationText,
                    common: commonPlugin
                });

                if (sampleConstructor !== undefined && sampleConstructor !== String) {
                    // collection that has editable paths
                    this.enumerate(`${command} [${dataFormat}] `, new sampleConstructor());
                }
                else
                {
                    // enumerate rest
                    this.enumerate(`${command} `, child);
                }
            } else if (typeof child.handleEndOfCommand === 'function') {
                // ConfigurationTermination handler
                this.helpItems.push({
                    plugin: this.pluginName,
                    command: command,
                    format: dataFormat,
                    common: commonPlugin
                });
            } else {
                // generic class
                this.enumerate(`${command} `, child);
            }
        }
    }

    handleEndOfCommand(context: ParserContext): Promise<Result> {
        let dialog = new context.dialog();
        for (let item of this.helpItems) {
            dialog.beginControlGroup();
            let label = `!${item.plugin} ${item.command}`
            if (item.format) {
                label = `!${item.plugin} ${item.command} ${item.format}`;
            }
            const plugin = item.common || item.plugin;
            const href = `https://derammo.github.io/der20/#${plugin}/${item.command.replace(/\[.*?\]/g, 'x').replace(/ /g, '_')}`;
            dialog.addLinkTextLine(label, href);
            dialog.addIndentedTextLine(`${item.validation || ''}`);
            dialog.endControlGroup();
            dialog.addSeparator();
        }
        return new DialogResult(DialogResult.Destination.caller, dialog.render()).resolve();
    }
}
