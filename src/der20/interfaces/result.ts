// WARNING: this was a discriminated union, but it does not appear to work at all on tsc 6.3.1
export interface Result {
    kind: Result.Kind;
    events: Set<Result.Event>;
    messages: string[];
    isSuccess(): boolean;
    hasEvents(): boolean;
}

export namespace Result {
    export enum Kind {
        Success = 1,
        Dialog,
        Failure,
        Asynchronous
    }

    export enum Event {
        Change = 1
    }
}

