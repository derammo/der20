import { Result } from 'der20/interfaces/result';

export class ResultBase implements Result {
    kind: Result.Kind;
    events: Set<Result.Event> = new Set<Result.Event>();
    messages: string[] = [];

    protected constructor(kind: Result.Kind) {
        this.kind = kind;
    }

    hasEvents(): boolean {
        return this.events.size > 0;
    }

    isSuccess(): boolean {
        return this.kind === Result.Kind.success;
    }

    resolve(): Promise<Result> {
        return Promise.resolve(this);
    }
}

export class DialogResult extends ResultBase {
    dialogs: string[] = [];

    constructor(public destination: DialogResult.Destination = DialogResult.Destination.caller, dialog: string) {
        super(Result.Kind.dialog);
        this.dialogs.push(dialog);
    }
}

// eslint-disable-next-line no-redeclare
export namespace DialogResult {
    // eslint-disable-next-line no-shadow
    export enum Destination {
        caller = 1,
        gm,
        allPlayers,
        all
    }
}

export class Failure extends ResultBase {
    errors: Error[] = [];
    constructor(error: Error) {
        super(Result.Kind.failure);
        this.errors.push(error);
    }
    toJSON() {
        return {
            kind: this.kind,
            errors: this.errors.map((item: Error) => {
                return item.message;
            })
        };
    }
}

export class Success extends ResultBase {
    constructor(message: string) {
        super(Result.Kind.success);
        this.messages.push(message);
    }
}

export class Cancellation extends ResultBase {
    constructor(message: string) {
        super(Result.Kind.cancellation);
        this.messages.push(message);
    }
}

export class Change extends Success {
    constructor(message: string) {
        super(message);
        this.events.add(Result.Event.change);
    }
}

export class ResultBuilder {
    static combined(results: Result[]): Result {
        let dialogs: string[] = [];
        let events: Set<Result.Event> = new Set();
        let messages: string[] = [];
        let failures: number = 0;
        let destination: DialogResult.Destination = DialogResult.Destination.caller;
        for (const result of results) {
            switch (result.kind) {
                case Result.Kind.success: {
                    const specific = (result as Success);
                    ResultBuilder.mergeEvents(events, specific.events);
                    messages = messages.concat(specific.messages);
                    break;
                }
                case Result.Kind.failure: {
                    failures++;
                    const specific = (result as Failure);
                    ResultBuilder.mergeEvents(events, specific.events);
                    messages = messages.concat(specific.messages);
                    messages = messages.concat(specific.errors.map(error => error.message));
                    break;
                }
                case Result.Kind.dialog: {
                    const specific = (result as DialogResult);
                    dialogs = dialogs.concat(specific.dialogs);
                    destination = specific.destination;
                    ResultBuilder.mergeEvents(events, specific.events);
                    messages = messages.concat(specific.messages);
                    break;
                }
                case Result.Kind.cancellation:
                default:
                    throw new Error(`unsupported result type ${result.kind}`);
            }
        }
        if (dialogs.length > 0) {
            if (failures > 0) {
                // present dialogs anyway
                messages.push(`WARNING: ${failures} sub-operations failed out of ${results.length}`)
            }    
            const combinedResult: DialogResult = new DialogResult(destination, '');
            combinedResult.dialogs = dialogs;
            combinedResult.events = events;
            combinedResult.messages = messages;
            return combinedResult;
        }
        if (failures > 0) {
            const combinedResult: Failure = new Failure(new Error(`${failures} sub-operations failed out of ${results.length}`));
            combinedResult.events = events;
            combinedResult.messages = messages;
            return combinedResult;
        } else {
            const combinedResult: Success = new Success('');
            combinedResult.events = events;
            combinedResult.messages = messages;
            return combinedResult;
        }
    }

    static mergeEvents(to: Set<Result.Event>, from: Set<Result.Event>) {
        for (let event of from) {
            debug.log(`event ${event} received from ${from.constructor.name}`);
            to.add(event);
        }
    }    
}