// WARNING: this was a discriminated union, but it does not appear to work at all on tsc 6.3.1
export namespace Result {
    export enum Kind {
        Success = 1,
        Dialog,
        Failure,
        Asynchronous // unknown result since executing asynchronously
    }

    export enum Event {
        Change = 'change'
    }

    export class Any {
        kind: Result.Kind;
        events: Set<Result.Event> = new Set<Result.Event>();
        messages: string[] = [];

        protected constructor(kind: Result.Kind) {
            this.kind = kind;
        }

        hasEvents(): boolean {
            return this.events.size > 0;
        }
    }

    export class Dialog extends Any {
        constructor(public destination: Dialog.Destination = Dialog.Destination.Caller, public dialog: string) {
            super(Result.Kind.Dialog);
        }
    }

    export namespace Dialog {
        export enum Destination {
            Caller,
            GM,
            AllPlayers,
            All
        }
    }

    export class Failure extends Any {
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

    export class Success extends Any {
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

    export class Asynchronous extends Any {
        promises: Record<string, Promise<any>> = {};

        constructor(message: string, key?: string, promise?: Promise<any>) {
            super(Result.Kind.Asynchronous);
            this.messages.push(message);
            if ((key !== undefined) || (promise !== undefined)) {
                this.promises[key] = promise;
            }
        }
    }
}
