import { Der20Character } from './character';
import { Result } from 'derlib/config/result';
import { ConfigurationCommand } from 'derlib/config/atoms';
import { ParserContext, ConfigurationSource } from 'derlib/config/context';

class TokenImage {
    constructor(private token: Graphic) {
        // generated source
    }

    get url(): string {
        return this.token.get('imgsrc');
    }
}

export class Der20Token {
    static selected(message: ApiChatEventData): Der20Token[] {
        if (!message.selected) {
            return [];
        }
        return message.selected
            .map((dict: any) => {
                return Der20Token.fetch(dict);
            })
            .filter((token: Der20Token | undefined) => {
                return typeof token !== 'undefined';
            });
    }

    static fetch(dict: { id: string | undefined; _id: string | undefined }): Der20Token {
        let token = getObj('graphic', dict.id);
        if (!token) {
            token = getObj('graphic', dict._id);
        }
        return new Der20Token(token);
    }

    constructor(private graphic: Graphic) {
        // generated code
    }

    get id(): string {
        return this.graphic.get('_id');
    }

    get raw(): Graphic {
        return this.graphic;
    }

    get image(): TokenImage {
        return new TokenImage(this.graphic);
    }

    get character(): Der20Character | undefined {
        let characterId = this.graphic.get('represents');
        if (characterId === undefined) {
            return undefined;
        }
        let journalEntry = getObj('character', characterId);
        if (journalEntry === undefined) {
            debug.log(`character id '${characterId}' does not identify a valid character`);
            return undefined;
        }
        return new Der20Character(journalEntry);
    }
}

export abstract class SelectedTokensCommand extends ConfigurationCommand {
    parse(line: string, context: ParserContext): Result.Any {
        if (context.source.kind !== ConfigurationSource.Kind.Api) {
            throw new Error('selected tokens command requires api source');
        }
        let source = <ConfigurationSource.Api>context.source;
        let message = <ApiChatEventData>source.message;
        let tokens = Der20Token.selected(message).filter((item: Der20Token | undefined) => {
            return item !== undefined;
        });
        if (tokens.length < 1) {
            return new Result.Failure(new Error('no valid tokens were selected for current command'));
        }
        let messages: string[] = [];
        let asyncResult: Result.Asynchronous;
        let result: Result.Any;
        let index = 0;
        for (let token of tokens) {
            result = this.handleToken(token, context, index);
            switch (result.kind) {
                case Result.Kind.Asynchronous: 
                    asyncResult = asyncResult || new Result.Asynchronous('asynchronous resources required by one or more token operations');
                    Object.assign(asyncResult.promises, (<Result.Asynchronous>result).promises);
                    messages = messages.concat(result.messages);
                    break;
                case Result.Kind.Success:
                    // generic success, accumulate messages
                    messages = messages.concat(result.messages);
                    break;
                default:
                    // prepend any collected messages, then abort iteration
                    result.messages = messages.concat(result.messages);
                    return result;
            }
            index++;
        }
        if (asyncResult) {
            result = asyncResult;
        } else {
            result = new Result.Success(`command executed against ${tokens.length} selected tokens`);
        }
        result.messages = result.messages.concat(messages);
        return result;
    }

    // tokenIndex is the index of the token in the selected tokens array, which remains the same during async retries
    abstract handleToken(token: Der20Token, parserContext: any, tokenIndex: number): Result.Any;
}
