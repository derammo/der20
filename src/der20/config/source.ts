import { ConfigurationSource } from "der20/interfaces/config";

export namespace ConfigurationSourceImpl {
    export class Base implements ConfigurationSource {
        constructor(public kind: ConfigurationSource.Kind) {
            // generated
        }
    }

    /**
     * Command was submitted via ! API command
     */
    export class Api extends Base {
        constructor(public player: Player, public message: ApiChatEventData) {
            super(ConfigurationSource.Kind.Api);
        }
    }
    
    /**
     * Command was read from a journal entry (handout etc.)
     */
    export class Journal extends Base {
        constructor(public type: string, public id: string) {
            super(ConfigurationSource.Kind.Journal);
        }
    }
}
