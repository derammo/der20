// WARNING: this was a discriminated union, but it does not appear to work at all on tsc 6.3.1
export interface Result {
    kind: Result.Kind;
    events: Set<Result.Event>;
    messages: string[];
    isSuccess(): boolean;
    hasEvents(): boolean;
    resolve(): Promise<Result>;
}

// eslint-disable-next-line no-redeclare
export namespace Result {
    // eslint-disable-next-line no-shadow
    export enum Kind {
        success = 1,
        dialog,
        failure,
        cancellation
    }

    // eslint-disable-next-line no-shadow
    export enum Event {
        /**
         * changed at least one value
         */
        change = 1
    }
}

