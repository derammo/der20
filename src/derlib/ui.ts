import { ConfigurationStep, ConfigurationString, ConfigurationInteger, ConfigurationBoolean, ConfigurationDate } from "./config";


// styling and layout taken from https://github.com/RobinKuiper/Roll20APIScripts with thanks
export class Der20Dialog {
    text: string[] = [];
    command_prefix: string;
    static readonly dialogStyle: string = "margin-left: 0px; overflow: hidden; background-color: #fff; border: 1px solid #000; padding: 5px; border-radius: 5px;";
    static readonly buttonStyle: string = "background-color: #000; border: 1px solid #292929; border-radius: 3px; padding: 5px; color: #fff; text-align: center; float: right;"
    static readonly commandStyle: string = "background-color: #000; border: 1px solid #292929; border-radius: 3px; padding: 5px; color: #fff; text-align: center; margin: auto; width: 98%; display: block; float: none;";
    static readonly labelStyle: string = "float: left; margin-top: 6px;";
    static readonly groupStyle: string = "overflow: hidden; list-style: none; padding: 0; margin: 0;";
    static readonly itemStyle: string = "overflow: hidden; margin-top: 5px;";

    constructor(command_prefix: string) {
        this.command_prefix = command_prefix;
        this.text.push(`<div style="${Der20Dialog.dialogStyle}">`);
    }

    beginControlGroup() {
        this.text.push(`<ul style="${Der20Dialog.groupStyle}">`);
    }

    endControlGroup() {
        this.text.push('</ul>');
    }

    addButton(label: string, target: string) {
        this.text.push(`<a style="${Der20Dialog.buttonStyle}", href="${this.command_prefix}${target}">${label}</a>`)
    }

    addEditControl(label: string, path: string, config: ConfigurationStep) {
        this.text.push(`<li style="${Der20Dialog.itemStyle}">`)
        this.text.push(`<span style="${Der20Dialog.labelStyle}">${label}</span>`);
        let value: string;
        let link: string;
        if (config instanceof ConfigurationString) {
            value = config.current;
            link = `${path} ?{${label}}`
        }
        if (config instanceof ConfigurationInteger) {
            value = `${config.current}`;
            // do we have an integer control available somewhere?
            link = `${path} ?{${label} (Integer)}`
        }
        if (config instanceof ConfigurationDate) {
            let current = new Date(config.current);
            value = `${current.toUTCString()}`;
            // do we have an integer control available somewhere?
            link = `${path} ?{${label} (in hours before now, e.g. 3.5 or date string)}`
        }
        if (config instanceof ConfigurationBoolean) {
            value = `${config.current === true}`;
            link = `${path} ${!config.current}`
        }
        this.addButton(value, link);
        this.text.push('</li>');
    }

    addCommand(label: string, target: string) {
        this.text.push(`<a style="${Der20Dialog.commandStyle}", href="${this.command_prefix}${target}">${label}</a>`)
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