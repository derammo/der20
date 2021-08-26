import { ConfigurationInteger, ConfigurationValueBase, Der20Attribute, Der20Character, ExportContext, Failure, ParserContext, Result, Success, Tokenizer } from 'der20/library';

export class CharacterConfiguration extends ConfigurationValueBase<string> {
    constructor() {
        super('', 'CHARACTER_ID hp|ac|pp VALUE');
    }

    parse(text: string, context: ParserContext): Result {
        const tokens = Tokenizer.tokenize(text);
        if (tokens.length < 3) {
            return new Failure(new Error(`character attribute change command requires arguments: ${this.format}`));
        }
        const character = Der20Character.fetch(tokens[0]);
        if (character === undefined) {
            return new Failure(new Error(`character with id "${tokens[0]}" not found`));
        }
        const integerValue = new ConfigurationInteger(0);
        const parseResult = integerValue.parse(tokens[2], context);
        if (!parseResult.isSuccess()) {
            return parseResult;
        }
        var attributeName = undefined;
        var copyToMax: boolean = false;
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
                return new Failure(new Error(`character attribute change command only supports: ${this.format}`));
        }
        var attribute = character.attribute(attributeName);
        if (!attribute.exists) {
            attribute = Der20Attribute.create(character, attributeName);
            attribute.raw.set('max', '');
        }
        if (copyToMax) {
            attribute.raw.setWithWorker('max', integerValue.value());
        }
        attribute.raw.setWithWorker('current', integerValue.value());
        return new Success(`set character ${character.name} ${attributeName} to ${integerValue.value()}`);
    }

    export(context: ExportContext): void {
        // nothing to export, we are ephemeral
    }
}
