// WARNING: this was a discriminated union, but it does not appear to work at all on tsc 6.3.1
export namespace Result {
    export enum Kind {
        Success = 1,
        Dialog,
        Failure
    }

    export enum Event {
        Change = 'change'
    }

    export class Any {
        kind: Result.Kind;
        events: Set<Result.Event> = new Set<Result.Event>();

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
    };

    export namespace Dialog {
        export enum Destination {
            Caller,
            GM,
            AllPlayers,
            All
        }
    };

    export class Failure extends Any {
        errors: Error[] = [];
        constructor(error: Error) {
            super(Result.Kind.Failure);
            this.errors.push(error);
        }
        toJSON() {
            return { 
                kind: this.kind, 
                errors: this.errors.map(function(item) { 
                    return item.message;
                })
            };
        }
    };

    export class Success extends Any {
        constructor() {
            super(Result.Kind.Success);
        }
    };

    export class Change extends Success {
        constructor() {
            super();
            this.events.add(Result.Event.Change);
        }
    }
};
