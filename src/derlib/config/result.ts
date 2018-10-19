export namespace Result {
    export enum Type {
        Success,
        Failure,
        Dialog
    };

    export class Dialog {
        type: Type.Dialog;
        constructor(public destination: Dialog.Destination = Dialog.Destination.Caller, public dialog: string) {
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

    export class Failure {
        type: Type.Failure;
        errors: Error[] = [];
        constructor(error: Error) {
            this.errors.push(error);
        }
    };

    export class Success {
        type: Type.Success;
    };

    export type Any = Success | Failure | Dialog;
};
