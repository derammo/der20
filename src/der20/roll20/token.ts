import { Der20Character } from './character';
import { ConfigurationCommand, ConfigurationSimpleCommand } from 'der20/config/atoms';
import { ParserContext } from 'der20/interfaces/parser';
import { Result } from 'der20/interfaces/result';
import { Multiplex } from './multiplex';

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
                return Der20Token.fetch(dict._id);
            })
            .filter((token: Der20Token | undefined) => {
                return typeof token !== 'undefined';
            });
    }

    static fetch(id: string): Der20Token {
        let token = getObj('graphic', id);
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

    get name(): string {
        return this.graphic.get('name');
    }

    get isdrawing(): boolean {
        return this.graphic.get('isdrawing');
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

class SelectedTokensMultiplex extends Multiplex<Der20Token> {
    protected itemsDescription: string = "selected tokens";

    constructor(context: ParserContext) {
        super(context);
    }

    protected createMultiplex(message: ApiChatEventData) : any[] {
        return Der20Token.selected(message).filter((item: Der20Token | undefined) => {
            return item !== undefined;
        });
    }
}

export abstract class SelectedTokensCommand extends ConfigurationCommand {
    parse(line: string, context: ParserContext): Result {
        const multiplex = new SelectedTokensMultiplex(context);
        return multiplex.execute(
            '', 
            (token: Der20Token, rest: string, parserContext: ParserContext, tokenIndex: number) => {
                return this.handleTokenCommand(token, rest, parserContext, tokenIndex);
            },
            (_parserContext: ParserContext) => {
                // no success action
            });    
    }

    // tokenIndex is the index of the token in the selected tokens array, which remains the same during async retries
    abstract handleTokenCommand(token: Der20Token, line: string, parserContext: ParserContext, tokenIndex: number): Result;
}

export abstract class SelectedTokensSimpleCommand extends ConfigurationSimpleCommand {
    handleEndOfCommand(context: ParserContext): Result {
        const multiplex = new SelectedTokensMultiplex(context);
        return multiplex.execute(
            '', 
            (token: Der20Token, _rest: string, parserContext: ParserContext, tokenIndex: number) => {
                return this.handleToken(token, parserContext, tokenIndex);
            },
            (_parserContext: ParserContext) => {
                // no success action
            });
    }

    // tokenIndex is the index of the token in the selected tokens array, which remains the same during async retries
    abstract handleToken(token: Der20Token, parserContext: ParserContext, tokenIndex: number): Result;
}
