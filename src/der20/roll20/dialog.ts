import { ConfigurationInteger, ConfigurationBoolean, ConfigurationDate, ConfigurationFloat } from 'der20/config/atoms';
import { Dialog } from 'der20/interfaces/ui';
import { ConfigurationEnumerated } from 'der20/config/enum';
import { Result } from 'der20/interfaces/result';
import { ConfigurationStep } from 'der20/config/base';
import { ConfigurationString } from 'der20/config/string';
import { CollectionItem, ConfigurationValue } from 'der20/interfaces/config';

// styling and layout based on https://github.com/RobinKuiper/Roll20APIScripts, with thanks
export class Der20ChatDialog implements Dialog {
    text: string[] = [];
    static readonly dialogStyle: string = 'margin-top: 0.5em; overflow: hidden; border: 1px solid Black; padding: 5px; border-radius: 5px;';
    static readonly buttonBaseStyle: string =
        'min-width: 6em; text-decoration: none; background-color: White; border: 1px solid #eeeeee; border-radius: 3px; padding-left: 5px; padding-right: 5px; padding-top: 0px; padding-bottom: 0px; text-align: center; float: right;';
    static readonly buttonStyle: string = Der20ChatDialog.buttonBaseStyle + 'color: Black;';
    static readonly defaultedButtonStyle: string = Der20ChatDialog.buttonBaseStyle + 'color: #aaaaaa;';
    static readonly commandStyle: string =
        'text-decoration: none; background-color: #000; border: 1px solid #292929; border-radius: 3px; padding: 5px; color: #fff; text-align: center; margin: auto; width: 98%; display: block; float: none;';
    static readonly externalLinkButtonStyle: string =
        'background-color: #0000ff; border: 1px solid #292929; border-radius: 3px; padding: 5px; color: #fff; text-align: center; margin: auto; width: 98%; display: block; float: none;';
    static readonly labelStyle: string = 'float: left;';
    static readonly groupStyle: string = 'overflow: hidden; list-style: none; padding: 0; margin: 0;';
    static readonly itemStyle: string = 'overflow: hidden; margin-top: 5px;';
    static readonly separatorStyle: string = 'margin-top: 1.0em; margin-bottom: 0.5em;';
    static readonly commandEchoStyle: string = `width: 98%%; border: 3px inset #ffffff; margin-top: 0.2em; padding: 0.2em; color: #3a3a3a; background-color: #eeeeee; font-family: Menlo, Monaco, 'Ubuntu Mono', monospace;`;
    static readonly commandEchoFailedStyle: string = `${Der20ChatDialog.commandEchoStyle} color: #ee0000;`;
    static readonly undefinedLabel = '[ NONE ]';

    constructor() {
        this.text.push(`<div style="${Der20ChatDialog.dialogStyle}">`);
    }

    beginControlGroup() {
        this.text.push(`<ul style="${Der20ChatDialog.groupStyle}">`);
    }

    endControlGroup() {
        this.text.push('</ul>');
    }

    private addButton(style: string, label: string, path: string, link: Dialog.Link) {
        let pathComponents = [ `!${link.command}` ];
        if (link.prefix !== undefined) {
            pathComponents.push(link.prefix);
        }
        pathComponents.push(path);
        if (link.suffix !== undefined) {
            pathComponents.push(link.suffix);
        }
        let linkText = pathComponents.join(' ');
        if (link.followUps !== undefined) {
            linkText = [ linkText ].concat(link.followUps).join('; ');
        }
        this.text.push(`<a style="${style}", href="${linkText}">${label}</a>`);
    }

    addEditControl<T>(label: string, path: string, config: ConfigurationStep<T>, link: Dialog.Link) {
        this.text.push(`<li style="${Der20ChatDialog.itemStyle}">`);
        this.text.push(`<span style="${Der20ChatDialog.labelStyle}">${label}</span>`);
        let text: string = '';
        let extendedPath: string = '';
        if (config instanceof ConfigurationString) {
            // already a string, but need to assert type
            let value = (<ConfigurationString>config).value();
            text = this.getStringText(value);
            extendedPath = `${path} ?{${label}}`;
        } else if (config instanceof ConfigurationInteger || config instanceof ConfigurationFloat) {
            let value = config.value();
            text = this.getNumberText<T>(value);
            // REVISIT do we have an integer control available somewhere?
            extendedPath = `${path} ?{${label} (Integer)}`;
        } else if (config instanceof ConfigurationDate) {
            let value = (<ConfigurationDate>config).value();
            text = this.getDateText(value);
            // REVISIT do we have an integer or date control available somewhere?
            extendedPath = `${path} ?{${label} (in hours before now, e.g. 3.5 or date string)}`;
        } else if (config instanceof ConfigurationBoolean) {
            text = `${(<ConfigurationBoolean>config).value() === true}`;
            extendedPath = `${path} ${!config.value()}`;
        } else if (config instanceof ConfigurationEnumerated) {
            text = this.getStringText((<ConfigurationEnumerated>config).value());
            let choices = (<ConfigurationEnumerated>config)
                .choices()
                .map(value => {
                    return value.replace(';', '\\;');
                })
                .map(value => {
                    if (value.length < 1) {
                        return `${Der20ChatDialog.undefinedLabel},`;
                    }
                    return `${value},${value}`;
                })
                .join('|');
            extendedPath = `${path} ?${label}|${choices}`;
        }
        if (config.hasConfiguredValue()) {
            this.addButton(Der20ChatDialog.buttonStyle, text, extendedPath, link);
        } else {
            this.addButton(Der20ChatDialog.defaultedButtonStyle, text, extendedPath, link);
        }
        this.text.push('</li>');
    }

    addTextLine(label: string) {
        let indent = '';
        if (label.startsWith(' ')) {
            const indentChars = label.match(/(?:[^ ]|$)/).index;
            indent = ` padding-left: ${indentChars}em;`
        }
        this.text.push(`<li style="${Der20ChatDialog.itemStyle}${indent}">`);
        this.text.push(label);
        this.text.push('</li>');
    }

    addLinkTextLine(text: string, target: string): void {
        this.text.push(`<li style="${Der20ChatDialog.itemStyle}">`);
        this.text.push(`<a href="${target}" style="color:blue;">${text}</a>`);
        this.text.push('</li>');
    }

    addIndentedTextLine(label: string) {
        this.text.push(`<li style="${Der20ChatDialog.itemStyle} margin-left: 3em;">`);
        this.text.push(label);
        this.text.push('</li>');
    }

    getStringText(value: string) {
        if (value === ConfigurationValue.UNSET) {
            return Der20ChatDialog.undefinedLabel;
        }
        return value;
    }

    getNumberText<T>(value: T) {
        if (value === ConfigurationValue.UNSET) {
            return Der20ChatDialog.undefinedLabel;
        }
        return `${value}`;
    }

    getDateText(value: number) {
        if (value === ConfigurationValue.UNSET) {
            return Der20ChatDialog.undefinedLabel;
        }
        return new Date(value).toUTCString();
    }

    addChoiceControlGroup(label: string, path: string, choices: CollectionItem[], link: Dialog.Link): void {
        this.beginControlGroup();
        for (let choice of choices) {
            this.text.push(`<li style="${Der20ChatDialog.itemStyle}">`);
            this.text.push(`<span style="${Der20ChatDialog.labelStyle}">${choice.name.value()}</span>`);
            let extendedPath: string = `${path} ${choice.id}`;
            this.addButton(Der20ChatDialog.buttonStyle, choice.id.substr(0, 10), extendedPath, link);
            this.text.push('</li>');
        }
        this.endControlGroup();
    }

    addSelectionGroup(label: string, path: string, choices: { label: string; result: string }[], link: Dialog.Link): void {
        this.beginControlGroup();
        for (let choice of choices) {
            this.text.push(`<li style="${Der20ChatDialog.itemStyle}">`);
            this.text.push(`<span style="${Der20ChatDialog.labelStyle}">${choice.label}</span>`);
            let extendedPath: string = `${path} ${choice.result}`;
            this.addButton(Der20ChatDialog.buttonStyle, choice.result.substr(0, 10), extendedPath, link);
            this.text.push('</li>');
        }
        this.endControlGroup();
    }

    addCommand(label: string, path: string, link: Dialog.Link) {
        this.addButton(Der20ChatDialog.commandStyle, label, path, link);
    }

    addExternalLinkButton(label: string, target: string) {
        this.text.push(`<a style="${Der20ChatDialog.externalLinkButtonStyle}", href="${target}">${label}</a>`);
    }

    addTitle(label: string) {
        this.text.push(`<h2>${label}</h2>`);
    }

    addSubTitle(label: string) {
        this.text.push(`<h3>${label}</h3>`);
    }

    addSeparator() {
        this.text.push(`<hr style='${Der20ChatDialog.separatorStyle}'>`);
    }

    renderCommandEcho(line: string, resultType: Result.Kind): string {
        let style = Der20ChatDialog.commandEchoStyle;
        if (resultType === Result.Kind.Failure) {
            style = Der20ChatDialog.commandEchoFailedStyle;
        }
        return `<div style="${style}">${line}</div>`;
    }

    render() {
        this.text.push('</div>');
        return this.text.join('');
    }
}
