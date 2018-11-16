import { Der20Character } from './character';
import { Success, Failure, Asynchronous } from 'der20/config/result';
import { ConfigurationCommand, ConfigurationSimpleCommand } from 'der20/config/atoms';
import { ParserContext } from 'der20/interfaces/parser';
import { Result } from 'der20/interfaces/result';
import { ConfigurationSource } from 'der20/interfaces/config';
import { ConfigurationSourceImpl } from 'der20/config/source';

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

    static fetch(dict: { id: string | undefined; _id?: string }): Der20Token {
        let token = getObj('graphic', dict.id);
        if (!token) {
            token = getObj('graphic', dict._id);
        }
        if (token === undefined) {
            return undefined;
        }
        return new Der20Token(token);
    }

    private characterCached = false;
    private characterCache: Der20Character;

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

    /**
     * this is the character represented by the token, or undefined
     * NOTE: this value is cached
     * REVISIT: provide a method to change 'represents' and invalidate cache
     */
    get character(): Der20Character | undefined {
        if (this.characterCached) {
            return this.characterCache;
        }
        this.characterCached = true;
        let characterId = this.graphic.get('represents');
        if (characterId === undefined) {
            return undefined;
        }
        let journalEntry = getObj('character', characterId);
        if (journalEntry === undefined) {
            debug.log(`character id '${characterId}' does not identify a valid character`);
            return undefined;
        }
        this.characterCache = new Der20Character(journalEntry);
        return this.characterCache;
    }
}

class SelectedTokensMultiplex {
    private mergeEvents(to: Set<Result.Event>, from: Set<Result.Event>, commentVerb: string) {
        for (let event of from) {
            debug.log(`${commentVerb} event ${event} received from token operation`);
            to.add(event);
        }
    }

    constructor(private context: ParserContext) {
        // generated code
    }
    execute(line: string, handler: (token: Der20Token, line: string, context: ParserContext, tokenIndex: number) => Result): Result {
        if (this.context.source.kind !== ConfigurationSource.Kind.Api) {
            throw new Error('selected tokens command requires api source');
        }
        let source = <ConfigurationSourceImpl.Api>this.context.source;
        let message = <ApiChatEventData>source.message;
        let tokens = Der20Token.selected(message).filter((item: Der20Token | undefined) => {
            return item !== undefined;
        });
        if (tokens.length < 1) {
            return new Failure(new Error('no valid tokens were selected for current command'));
        }
        let messages: string[] = [];
        let asyncResult: Asynchronous;
        let result: Result;
        let index = 0;
        let events: Set<Result.Event> = new Set<Result.Event>();
        for (let token of tokens) {
            result = handler(token, line, this.context, index);
            this.mergeEvents(events, result.events, 'saving');
            // now interpret result
            switch (result.kind) {
                case Result.Kind.Asynchronous:
                    asyncResult = asyncResult || new Asynchronous('asynchronous resources required by one or more token operations');
                    Object.assign(asyncResult.promises, (<Asynchronous>result).promises);
                    messages = messages.concat(result.messages);
                    break;
                case Result.Kind.Success:
                    // generic success, accumulate messages
                    messages = messages.concat(result.messages);
                    break;
                default:
                    // prepend any collected messages and add any collected events, then abort iteration
                    result.messages = messages.concat(result.messages);
                    this.mergeEvents(result.events, events, 'restoring');
                    return result;
            }
            index++;
        }
        if (asyncResult !== undefined) {
            result = asyncResult;
        } else {
            result = new Success(`command executed against ${tokens.length} selected tokens`);
        }
        result.messages = result.messages.concat(messages);
        this.mergeEvents(result.events, events, 'restoring');
        return result;
    }
}

export abstract class SelectedTokensCommand extends ConfigurationCommand {
    parse(line: string, context: ParserContext): Result {
        const multiplex = new SelectedTokensMultiplex(context);
        return multiplex.execute('', (token: Der20Token, rest: string, parserContext: ParserContext, tokenIndex: number) => {
            return this.handleTokenCommand(token, rest, parserContext, tokenIndex);
        });    
    }

    // tokenIndex is the index of the token in the selected tokens array, which remains the same during async retries
    abstract handleTokenCommand(token: Der20Token, line: string, parserContext: ParserContext, tokenIndex: number): Result;
}

export abstract class SelectedTokensSimpleCommand extends ConfigurationSimpleCommand {
    handleEndOfCommand(context: ParserContext): Result {
        const multiplex = new SelectedTokensMultiplex(context);
        return multiplex.execute('', (token: Der20Token, rest: string, parserContext: ParserContext, tokenIndex: number) => {
            return this.handleToken(token, parserContext, tokenIndex);
        });
    }

    // tokenIndex is the index of the token in the selected tokens array, which remains the same during async retries
    abstract handleToken(token: Der20Token, parserContext: ParserContext, tokenIndex: number): Result;
}
