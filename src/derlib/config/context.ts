import { Result } from "./result";

export interface ConfigurationContext {

}
    
export namespace ConfigurationSource {
    export enum Kind {
        Api = 1,
        Journal
    }

    export class Any {
        constructor(public kind: Kind) {
            // generated
        }
    }

    export class Api extends Any {
        constructor(public player: Player, public message: ApiChatEventData) {
            super(Kind.Api);
        }
    }
    
    export class Journal extends Any {
        constructor(public type: string, public id: string) {
            super(Kind.Journal);
        }
    }
}

export interface ParserContext {
    asyncVariables: Record<string, any>;
    source: ConfigurationSource.Any;
}

export interface ConfigurationParsing {
    parse(line: string, context: ParserContext): Result.Any;
}

export interface LoaderContext extends ConfigurationContext {
    addCommand(source: ConfigurationSource.Any, command: string): void;
    addAsynchronousLoad<T>(promise: Promise<T>, whenDone: (value: T) => void): void;
    addMessage(message: string): void;
}

export interface ConfigurationLoading {
    load(json: any, context: LoaderContext): void;
}
