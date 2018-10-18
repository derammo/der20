export class Der20Dialog {
    text: string[] = [];
    static readonly textStyle: string = "margin-left: 0px; overflow: hidden; background-color: #fff; border: 1px solid #000; padding: 5px; border-radius: 5px;";
    static readonly buttonStyle: string = "background-color: #000; border: 1px solid #292929; border-radius: 3px; padding: 5px; color: #fff; text-align: center; float: right;"

    constructor() {
    }

    // XXX instead of target, provide a config object, which implies the string and specifies the type
    addButton(label: string, target: string) {
        this.text.push(`<a style="${Der20Dialog.buttonStyle}", href="${target}">${label}</a>`)
    }

    send() {
        for (let line of this.text) {
            console.log(line);
        }
        return this.text.join('\n');
    }
}