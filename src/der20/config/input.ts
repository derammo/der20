import { CommandInput } from "der20/interfaces/config";

export namespace CommandInputImpl {
    export class Base implements CommandInput {
        constructor(public kind: CommandInput.Kind) {
            // generated
        }

        authorize(rest: string): boolean {
            return true;
        }
    }

    /**
     * Command was executed in response to configuration loading
     */
    export class Restore extends Base {
        constructor() {
            super(CommandInput.Kind.restore);
        }
    }
}
