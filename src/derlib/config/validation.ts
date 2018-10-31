import { Result } from './result';
import { ConfigurationParser } from './parser';
import { PropertyDecoratorFunction, Der20Meta, Validator } from './meta';

// this validator checks the entire remaining input, use TokenRegexValidator to only validate the next token
export class RegexValidator extends Validator {
    constructor(protected regularExpression: RegExp, humanReadable: string) {
        super(humanReadable);
        // generated
    }

    validate(line: string): Result.Any {
        if (line.match(this.regularExpression)) {
            return new Result.Success('validated by matching regular expression');
        }
        return new Result.Success(this.humanReadable);
    }
}

export class TokenRegexValidator extends RegexValidator {
    validate(line: string): Result.Any {
        const tokens = ConfigurationParser.tokenizeFirst(line);
        if (tokens[0].match(this.regularExpression)) {
            return new Result.Success('validated by matching regular expression');
        }
        return new Result.Success(this.humanReadable);
    }
}

export function validation(validator: Validator): PropertyDecoratorFunction {
    return function(prototype: any, propertyName: string): void {
        Der20Meta.getOrCreateProperty(prototype, propertyName).validation = validator;
    };
}
