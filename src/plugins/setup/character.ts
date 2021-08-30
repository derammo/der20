import { ConfigurationValueBase, Der20Attribute, Der20Character, ExportContext, Failure, ParserContext, Result, Success, Tokenizer } from 'der20/library';

export class CharacterConfiguration extends ConfigurationValueBase<string> {
    constructor() {
        super('', 'CHARACTER_ID hp|ac|pp VALUE');
    }

    parse(text: string, _context: ParserContext): Promise<Result> {
        const tokens = Tokenizer.tokenize(text);
        if (tokens.length < 3) {
            return new Failure(new Error(`character attribute change command requires arguments: ${this.format}`)).resolve();
        }
        const character = Der20Character.fetch(tokens[0]);
        if (character === undefined) {
            return new Failure(new Error(`character with id "${tokens[0]}" not found`)).resolve();
        }
        const integerValue = parseInt(tokens[2], 10);
        if (isNaN(integerValue)) {
            return new Failure(new Error(`${tokens[2]} is not a valid integer`)).resolve();
        }
        let attributeName = undefined;
        let copyToMax: boolean = false;
        switch (tokens[1]) {
            case 'hp':
                attributeName = 'hp';
                copyToMax = true;
                break;
            case 'ac':
                attributeName = 'ac';
                break;
            case 'pp':
                attributeName = 'passive_wisdom';
                break;
            default:
                return new Failure(new Error(`character attribute change command only supports: ${this.format}`)).resolve();
        }
        this.writeChanges(character, attributeName, copyToMax, integerValue);
        return new Success(`set character ${character.name} ${attributeName} to ${integerValue}`).resolve();
    }

    private writeChanges(character: Der20Character, attributeName: string, copyToMax: boolean, integerValue: number) {
        let attribute = character.attribute(attributeName);
        if (!attribute.exists) {
            attribute = Der20Attribute.create(character, attributeName);
            attribute.raw.set('max', '');
        }
        if (copyToMax) {
            attribute.raw.setWithWorker('max', integerValue);
        }
        attribute.raw.setWithWorker('current', integerValue);
    }

    export(context: ExportContext): void {
        // nothing to export, we are ephemeral
    }
}
