/**
 * Base context passed to all parsing or configuration loading functions, represents the execution of
 * one command or one load from JSON.
 */
export interface ConfigurationContext {
    /** 
     * Swap in specific global handlers whenever work is asynchronously resumed.
     * It is specifically used to debug log based on the plugin, even if the 
     * code executing is in the library.
     */
    swapIn(): void;
}

/**
 * A source of a configuration command, available in parser context
 * 
 * XXX this is crap.  it is roll20 specific and really should be part of ConfigurationContext?  also the name clashes with ConfigurationCommandSource (which should have this name)
 */
export interface CommandInput {
    kind: CommandInput.Kind;

    /**
     * @param rest is the command line not including the !command
     * @returns true if the operation should be permitted
     */
    authorize(rest: string): boolean;
}

// eslint-disable-next-line no-redeclare
export namespace CommandInput {
    /**
     * Supported configuration sources
     */
    // eslint-disable-next-line no-shadow
    export enum Kind {
        api = 1,
        journal,
        restore,
        token
    }
}

/**
 * Classes that represent a configurable value and its default implement this.
 */
export interface ConfigurationValue<T> {
    defaultValue: T;
    value(): T;
    hasConfiguredValue(): boolean;
}

// eslint-disable-next-line no-redeclare
export namespace ConfigurationValue {
    // this is the value we use for unpopulated data
    export const UNSET: undefined = undefined;
}

/**
 * Classes that represent an item from a configurable collection indexed by a string id implement this.
 */
export interface CollectionItem {
    id: string | null;
    name: ConfigurationValue<string>;
}

/**
 * Collection-like classes that support removal by id implement this.
 */
export interface ItemRemoval {
    removeItem(id: string): boolean;
}

/**
 * Configurable colections indexed by a string id implement this.
 */
export interface Collection extends ItemRemoval {
    fetchItem(id: string): CollectionItem | undefined;
    [Symbol.iterator](): Iterator<CollectionItem>;
}

/**
 * Classes that handle change events from parsing implement this, to be called by parser after command execution.
 */
export interface ConfigurationChangeHandling {
    handleChange(changedKeyword: string): Promise<void>;
}

// eslint-disable-next-line no-redeclare
export namespace ConfigurationChangeHandling {
    export function query(target: any) {
        return interfaceQuery<ConfigurationChangeHandling>(target, ['handleChange']);
    } 
}

/**
 * Classes that support registration of an external change event handler implement this.
 */
export interface ConfigurationChangeDelegation {
    onChangeEvent(handler: (changedKeyword: string) => Promise<void>): void;
}

export function interfaceQuery<InterfaceType>(target: any, functionNames: string[]): { supported: boolean, interface: InterfaceType|undefined } {
    if (functionNames.some(name => typeof target[name] !== 'function')) {
        return { supported: false, interface: undefined };
    } else {
        return { supported: true, interface: <InterfaceType>target };
    }
}