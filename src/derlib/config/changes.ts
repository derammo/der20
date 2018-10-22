import { ConfigurationStep } from "./atoms";
import { Result } from "./result";

type HandlersByEvent = { [EventKey in Result.Event]: ConfigurationUpdate.Base[] };

export class ConfigurationEventHandler {
    private handlers: { [index: string]: HandlersByEvent } | { clone: () => void };

    constructor() {
        this.handlers = { clone: () => {
            return this.handlers;
        }}
    }

    addTrigger(source: string, event: Result.Event, update: ConfigurationUpdate.Base): void {

    }

    handleEvents(source: string, result: Result.Any): Result.Any {
        let handlers = this.handlers[source];
        for (let event of result.events) {
            // XXX process all handlers[event] until one changes the result to a failure
        }
        return result;
    }
}

export namespace ConfigurationUpdate {  
    // WARNING: descendants of this class must not maintain direct references to config objects because 
    // these items are shared by all clones of the config subtree
    export abstract class Base {
        abstract execute(configuration: any): void;
    }  
    export class Default<SOURCE, TARGET> extends Base {
        constructor(private path: string[], private calculator: (source: ConfigurationStep<SOURCE>) => TARGET) {
            super();
        }

        execute(configuration: any) {

        }
    }
}