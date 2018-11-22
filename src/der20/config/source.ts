import { CommandSource } from "der20/interfaces/config";

export namespace CommandSourceImpl {
    export class Base implements CommandSource {
        constructor(public kind: CommandSource.Kind) {
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
            super(CommandSource.Kind.Restore);
        }
    }
}
