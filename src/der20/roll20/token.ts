import { Der20Character } from './character';
import { ConfigurationCommand } from 'der20/config/atoms';
import { Result } from 'der20/interfaces/result';
import { ExecuteHandlerType, Multiplex, SuccessHandlerType } from './multiplex';
import { ApiCommandInput } from 'der20/plugin/chat';
import { ParserContext } from 'der20/interfaces/parser';

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
                // eslint-disable-next-line no-underscore-dangle
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

class SelectedTokensMultiplex extends Multiplex<ApiChatEventData, Der20Token> {
    protected itemsDescription: string = "selected tokens";

    constructor(parserContext: ParserContext) {
        super(parserContext);
    }

    protected createMultiplex(message: ApiChatEventData) : Der20Token[] {
        return Der20Token.selected(message).filter((item: Der20Token | undefined) => {
            return item !== undefined;
        });
    }

    public executeForSelectedTokens(text: string, handler: ExecuteHandlerType<ApiChatEventData, Der20Token>, successHandler?: SuccessHandlerType<ApiChatEventData>): Promise<Result> {
        const source = <ApiCommandInput>(this.parserContext.input);
        const message = <ApiChatEventData>source.message;
        return this.execute(text, message, handler, successHandler);
    }
}

export abstract class SelectedTokensCommand extends ConfigurationCommand {
    parse(inputText: string, context: ParserContext): Promise<Result> {
        return new SelectedTokensMultiplex(context).executeForSelectedTokens(
            inputText, 
            (message: ApiChatEventData, token: Der20Token, text: string, parserContext: ParserContext, tokenIndex: number) => {
                return this.handleTokenCommand(message, token, text, parserContext, tokenIndex);
            });    
    }

    // tokenIndex is the index of the token in the selected tokens array
    abstract handleTokenCommand(message: ApiChatEventData, token: Der20Token, text: string, parserContext: ParserContext, tokenIndex: number): Promise<Result>;
}
