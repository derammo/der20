import { Der20Meta, PropertyDecoratorFunction, Validator } from './meta';
import { Result } from 'der20/interfaces/result';
import { Success, Failure } from './result';
import { Tokenizer } from './tokenizer';

// this validator checks the entire remaining input, use TokenRegexValidator to only validate the next token
export class RegexValidator extends Validator {
    constructor(protected regularExpression: RegExp, humanReadable: string) {
        super(humanReadable);
        // generated
    }

    validate(text: string): Result {
        if (text.match(this.regularExpression)) {
            return new Success('validated by matching regular expression');
        }
        return new Failure(new Error(this.humanReadable));
    }
}

export class TokenRegexValidator extends RegexValidator {
    validate(line: string): Result {
        const tokens = Tokenizer.tokenizeFirst(line);
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
