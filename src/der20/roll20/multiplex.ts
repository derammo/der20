import { Failure, ResultBuilder } from 'der20/config/result';
import { ParserContext } from "der20/interfaces/parser";
import { Result } from 'der20/interfaces/result';
import { CommandInput } from 'der20/interfaces/config';

export type ExecuteHandlerType<MultiplexContext, MultiplexItem> = (multiplexContext: MultiplexContext, multiplexItem: MultiplexItem, text: string, parserContext: ParserContext, multiplexIndex: number) => Promise<Result>;
export type SuccessHandlerType<MultiplexContext> = (multiplexContext: MultiplexContext, parserContext: ParserContext) => Promise<Result>;

export abstract class Multiplex<MultiplexContext, MultiplexItem> {
    constructor(protected parserContext: ParserContext) {
        // no code
    }

    private mergeEvents(to: Set<Result.Event>, from: Set<Result.Event>, comment: string) {
        for (let event of from) {
            debug.log(`${comment} event ${event} received from ${this.itemsDescription} operation`);
            to.add(event);
        }
    }

    execute(inputText: string,
        multiplexContext: MultiplexContext, 
        handler: ExecuteHandlerType<MultiplexContext, MultiplexItem>, 
        successHandler?: SuccessHandlerType<MultiplexContext>): Promise<Result> {
        if (this.parserContext.input.kind !== CommandInput.Kind.api) {
            throw new Error(`${this.itemsDescription} command requires api source`);
        }

        const multiplex: MultiplexItem[] = this.createMultiplex(multiplexContext);
        if (multiplex.length < 1) {
            return new Failure(new Error(`no valid ${this.itemsDescription} found for current command`)).resolve();
        }

        debug.log(`multiplexing '${inputText}' for ${multiplex.length} ${this.itemsDescription}`);
        const messages: string[] = [];
        let promises: Promise<Result>[] = [];
        let index = 0;
        const events: Set<Result.Event> = new Set<Result.Event>();
        for (const multiplexItem of multiplex) {
            promises.push(handler(multiplexContext, multiplexItem, inputText, this.parserContext, index));
            index++;
        }

        // now they are all conceptually running, so reap them all and process results
        return Promise.all(promises)
            .then(ResultBuilder.combined)
            .then((combinedResult: Result) => {
                if (!combinedResult.isSuccess) {
                    return combinedResult;
                }
                if (successHandler !== undefined) {
                    return successHandler(multiplexContext, this.parserContext)
                        .then((result: Result) => {
                            // also add the parent result to the combined result
                            this.mergeEvents(result.events, events, "item");
                            result.messages = messages.concat(result.messages);
                            return ResultBuilder.combined([result, combinedResult]);;
                        });
                } else {
                    // no parent handling of success
                    return combinedResult;
                }
            });
    }

    protected abstract itemsDescription: string;
    protected abstract createMultiplex(multiplexContext: MultiplexContext): MultiplexItem[];
}

