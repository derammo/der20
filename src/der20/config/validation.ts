import { Der20Meta, PropertyDecoratorFunction, Validator } from './meta';
import { Result } from 'der20/interfaces/result';
import { Success, Failure } from './result';

// this validator checks the entire remaining input, use TokenRegexValidator to only validate the next token
export class RegexValidator extends Validator {
    constructor(protected regularExpression: RegExp, humanReadable: string) {
        super(humanReadable);
        // generated
    }

    validate(line: string): Result {
        if (line.match(this.regularExpression)) {
            return new Success('validated by matching regular expression');
        }
        return new Failure(new Error(this.humanReadable));
    }
}

export class TokenRegexValidator extends RegexValidator {
    // XXX move to common base shared with ConfigurationParser
    static tokenizeFirst(line: string) {
        let clean = line.trim();
        let space = clean.indexOf(' ');
        if (space < 0) {
            return [clean, ''];
        }
        return [clean.substr(0, space), clean.substr(space + 1)];
    }
    validate(line: string): Result {
        const tokens = TokenRegexValidator.tokenizeFirst(line);
        if (tokens[0].match(this.regularExpression)) {
            return new Success('validated by matching regular expression');
        }
        return new Failure(new Error(this.humanReadable));
    }
}

export function validation(validator: Validator): PropertyDecoratorFunction {
    return function(prototype: any, propertyName: string): void {
        Der20Meta.getOrCreateProperty(prototype, propertyName).validation = validator;
    };
}
