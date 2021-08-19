import { Success, Failure, Asynchronous } from 'der20/config/result';
import { ParserContext } from 'der20/interfaces/parser';
import { Result } from 'der20/interfaces/result';
import { CommandInput } from 'der20/interfaces/config';
import { ApiCommandInput } from 'der20/plugin/chat';

export abstract class Multiplex<MultiplexContext> {
    constructor(protected context: ParserContext) {
        // no code
    }

    private mergeEvents(to: Set<Result.Event>, from: Set<Result.Event>, commentVerb: string) {
        for (let event of from) {
            debug.log(`${commentVerb} event ${event} received from ${this.itemsDescription} operation`);
            to.add(event);
        }
    }

    execute(line: string, handler: (multiplexContext: MultiplexContext, line: string, parserContext: ParserContext, multiplexIndex: number) => Result, successHandler: (parserContext: ParserContext) => void): Result {
        if (this.context.input.kind !== CommandInput.Kind.Api) {
            throw new Error(`${this.itemsDescription} command requires api source`);
        }
        let source = <ApiCommandInput>this.context.input;
        let message = <ApiChatEventData>source.message;
        let multiplex: MultiplexContext[] = this.createMultiplex(message);
        if (multiplex.length < 1) {
            return new Failure(new Error(`no valid ${this.itemsDescription} found for current command`));
        }
        let messages: string[] = [];
        let asyncResult: Asynchronous;
        let result: Result;
        let index = 0;
        let events: Set<Result.Event> = new Set<Result.Event>();
        for (let multiplexContext of multiplex) {
            result = handler(multiplexContext, line, this.context, index);
            this.mergeEvents(events, result.events, 'saving');
            // now interpret result
            switch (result.kind) {
                case Result.Kind.Asynchronous:
                    asyncResult = asyncResult || new Asynchronous(`asynchronous resources required by one or more ${this.itemsDescription} operations`);
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
            successHandler(this.context);
            result = new Success(`command executed against ${multiplex.length} ${this.itemsDescription}`);
        }
        result.messages = result.messages.concat(messages);
        this.mergeEvents(result.events, events, 'restoring');
        return result;
    }

    protected abstract itemsDescription: string;
    protected abstract createMultiplex(message: ApiChatEventData): MultiplexContext[];
}

