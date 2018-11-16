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
        return this.kind === Result.Kind.Success;
    }
}

export class DialogResult extends ResultBase {
    constructor(public destination: DialogResult.Destination = DialogResult.Destination.Caller, public dialog: string) {
        super(Result.Kind.Dialog);
    }
}

export namespace DialogResult {
    export enum Destination {
        Caller = 1,
        GM,
        AllPlayers,
        All
    }
}

export class Failure extends ResultBase {
    errors: Error[] = [];
    constructor(error: Error) {
        super(Result.Kind.Failure);
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
        super(Result.Kind.Success);
        this.messages.push(message);
    }
}

export class Change extends Success {
    constructor(message: string) {
        super(message);
        this.events.add(Result.Event.Change);
    }
}

export class Asynchronous extends ResultBase {
    promises: Record<string, Promise<any>> = {};

    constructor(message: string, key?: string, promise?: Promise<any>) {
        super(Result.Kind.Asynchronous);
        this.messages.push(message);
        if (key !== undefined || promise !== undefined) {
            this.promises[key] = promise;
        }
    }
}
