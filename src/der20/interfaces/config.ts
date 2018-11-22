/**
 * Base context passed to all parsing or configuration loading functions, represents the execution of
 * one command or one load from JSON.
 */
export interface ConfigurationContext {}

/**
 * A source of a configuration command, available in parser context
 */
export interface CommandSource {
    kind: CommandSource.Kind;

    /**
     * @param rest is the command line not including the !command
     * @returns true if the operation should be permitted
     */
    authorize(rest: string): boolean;
}
export namespace CommandSource {
    /**
     * Supported configuration sources
     */
    export enum Kind {
        Api = 1,
        Journal,
        Restore,
        Token
    }
}

/**
 * Classes that represent a configurable value and its default implement this.
 */
export interface ConfigurationValue<T> {
    default: T;
    value(): T;
    hasConfiguredValue(): boolean;
}
export namespace ConfigurationValue {
    // this is the value we use for unpopulated data
    export const UNSET: undefined = undefined;
}

/**
 * Classes that represent an item from a configurable collection indexed by a string id implement this.
 */
export interface CollectionItem {
    id: string;
    name: ConfigurationValue<string>;
}

/**
 * Configurable colections indexed by a string id implement this.
 */
export interface Collection {
    removeItem(id: string): boolean;
}

/**
 * Classes that handle change events from parsing implement this, to be called by parser after command execution.
 */
export interface ConfigurationChangeHandling {
    handleChange(changedKeyword: string): void;
}

/**
 * Classes that support registration of an external change event handler implement this.
 */
export interface ConfigurationChangeDelegation {
    onChangeEvent(handler: (changedKeyword: string) => void): void;
}
