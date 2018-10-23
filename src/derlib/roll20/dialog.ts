import { ConfigurationStep, ConfigurationString, ConfigurationInteger, ConfigurationBoolean, ConfigurationDate, ConfigurationFloat } from "derlib/config/atoms";

// styling and layout taken from https://github.com/RobinKuiper/Roll20APIScripts with thanks
export class Der20Dialog {
    text: string[] = [];
    commandPrefix: string;
    static readonly dialogStyle: string = "margin-left: 0px; overflow: hidden; background-color: White; border: 1px solid Black; padding: 5px; border-radius: 5px;";
    static readonly buttonStyle: string = "text-decoration: none; background-color: White; border: 1px solid Black; border-radius: 3px; padding: 5px; color: Black; text-align: center; float: right;"
    static readonly defaultedButtonStyle: string = "text-decoration: none; background-color: White; border: 1px solid Black; border-radius: 3px; padding: 5px; color: #aaa; text-align: center; float: right;"
    static readonly commandStyle: string = "text-decoration: none; background-color: #000; border: 1px solid #292929; border-radius: 3px; padding: 5px; color: #fff; text-align: center; margin: auto; width: 98%; display: block; float: none;";
    static readonly externalLinkButtonStyle: string = "background-color: #0000ff; border: 1px solid #292929; border-radius: 3px; padding: 5px; color: #fff; text-align: center; margin: auto; width: 98%; display: block; float: none;";
    static readonly labelStyle: string = "float: left; margin-top: 6px;";
    static readonly groupStyle: string = "overflow: hidden; list-style: none; padding: 0; margin: 0;";
    static readonly itemStyle: string = "overflow: hidden; margin-top: 5px;";
    static readonly undefinedLabel = '[ NONE ]';

    constructor(commandPrefix: string) {
        this.commandPrefix = commandPrefix;
        this.text.push(`<div style="${Der20Dialog.dialogStyle}">`);
    }

    beginControlGroup() {
        this.text.push(`<ul style="${Der20Dialog.groupStyle}">`);
    }

    endControlGroup() {
        this.text.push('</ul>');
    }

    addButton(label: string, target: string) {
        this.text.push(`<a style="${Der20Dialog.buttonStyle}", href="${this.commandPrefix}${target}">${label}</a>`)
    }

    private addDefaultedButton(label: string, target: string) {
        this.text.push(`<a style="${Der20Dialog.defaultedButtonStyle}", href="${this.commandPrefix}${target}">${label}</a>`)
    }

    addEditControl<T>(label: string, path: string, config: ConfigurationStep<T>) {
        this.text.push(`<li style="${Der20Dialog.itemStyle}">`)
        this.text.push(`<span style="${Der20Dialog.labelStyle}">${label}</span>`);
        let defaulted = (config.current === ConfigurationStep.NO_VALUE);
        let text: string = '';
        let link: string = '';
        if (config instanceof ConfigurationString) {
            // already a string, but need to assert type
            let value = (<ConfigurationString>config).value();
            text = this.getStringText(value);
            link = `${path} ?{${label}}`
        } else if ((config instanceof ConfigurationInteger)
            || (config instanceof ConfigurationFloat)) {
            let value = config.value();
            text = this.getNumberText<T>(value);
            // REVISIT do we have an integer control available somewhere?
            link = `${path} ?{${label} (Integer)}`
        } else if (config instanceof ConfigurationDate) {
            let value = (<ConfigurationDate>config).value();
            text = this.getDateText(value);
            // REVISIT do we have an integer or date control available somewhere?
            link = `${path} ?{${label} (in hours before now, e.g. 3.5 or date string)}`
        } else if (config instanceof ConfigurationBoolean) {
            text = `${(<ConfigurationBoolean>config).value() === true}`;
            link = `${path} ${!config.current}`
        }
        if (defaulted) {
            this.addDefaultedButton(text, link);
        } else {
            this.addButton(text, link);
        }
        this.text.push('</li>');
    }

    addTextLine(label: string) {
        this.text.push(`<li style="${Der20Dialog.itemStyle}">`)
        this.text.push(label);
        this.text.push('</li>');
    }

    private getStringText(value: string) {
        if (value === ConfigurationStep.NO_VALUE) {
            return Der20Dialog.undefinedLabel;
        }
        return value;
    }

    private getNumberText<T>(value: T) {
        if (value === ConfigurationStep.NO_VALUE) {
            return Der20Dialog.undefinedLabel;
        }
        return`${value}`;
    }

    private getDateText(value: number) {
        if (value === ConfigurationStep.NO_VALUE) {
            return Der20Dialog.undefinedLabel;
        }
        return new Date(value).toUTCString();
    }

    addChoiceControl(label: string, target: string) {
        throw new Error("unimplemented");
    }

    addCommand(label: string, target: string) {
        this.text.push(`<a style="${Der20Dialog.commandStyle}", href="${this.commandPrefix}${target}">${label}</a>`)
    }

    addExternalLinkButton(label: string, target: string) {
        this.text.push(`<a style="${Der20Dialog.externalLinkButtonStyle}", href="${target}">${label}</a>`)
    }

    addTitle(label: string) {
        this.text.push(`<h2>${label}</h2>`)
    }

    addSubTitle(label: string) {
        this.text.push(`<h3>${label}</h3>`)
    }

    addSeparator() {
        this.text.push('<hr>')
    }

    render() {
        this.text.push('</div>');
        return this.text.join('');
    }
}