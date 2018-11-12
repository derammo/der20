import { Result } from "./result";
import { DialogFactory } from "derlib/ui";
import { Options } from "derlib/options";

/**
 * Base context passed to all parsing or configuration loading functions, represents the execution of
 * one command or one load from JSON.
 */
export interface ConfigurationContext {
    /**
     * frozen configuration
     */
    options: Options;
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

    /**
     * Command was submitted via ! API command
     */
    export class Api extends Any {
        constructor(public player: Player, public message: ApiChatEventData) {
            super(Kind.Api);
        }
    }
    
    /**
     * Command was read from a journal entry (handout etc.)
     */
    export class Journal extends Any {
        constructor(public type: string, public id: string) {
            super(Kind.Journal);
        }
    }
}

/**
 * Context passed to any parsing functions for a specific command execution.
 */
export interface ParserContext {
    asyncVariables: Record<string, any>;
    source: ConfigurationSource.Any;
    command: string;
    rest: string;
    dialog: DialogFactory;
}

/**
 * Classes that handle their own parsing implement this.
 */
export interface ConfigurationParsing {
    parse(line: string, context: ParserContext): Result.Any;
}

/**
 * Classes that want to create content if the command line ends 
 * after their keyword implement this.
 * 
 * For example, creating an interactive dialog when no item was selected
 * is done by implementing this.
 */
export interface ConfigurationTermination {
    handleEndOfCommand(context: ParserContext): Result.Any;
}

/**
 * Context passed to functions during a specific load from JSON, which usually is the entire configuration being restored.
 */
export interface LoaderContext extends ConfigurationContext {
    addCommand(source: ConfigurationSource.Any, command: string): void;
    addAsynchronousLoad<T>(promise: Promise<T>, whenDone: (value: T) => void): void;
    addMessage(message: string): void;
}

/**
 * Classes that can be restored from JSON implement this.
 */
export interface ConfigurationLoading {
    load(json: any, context: LoaderContext): void;
}

/**
 * Classes that handle change events from parsing implement this, to be called by parser after command execution.
 */
export interface ConfigurationChangeHandling {
    handleChange(keyword: string): void;
}

/**
 * Classes that support registration of an external change event handler implement this.
 */
export interface ConfigurationChangeDelegation {
    onChangeEvent(handler: (keyword: string) => void): void;
}
