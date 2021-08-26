import { ConfigurationContext } from 'der20/interfaces/config';


/**
 * Context passed to functions during a specific load from JSON, which usually is the entire configuration being restored.
 */
export interface LoaderContext extends ConfigurationContext {
    addAsynchronousLoad<T>(promise: Promise<T>, whenDone: (value: T) => void): void;
    addMessage(message: string): void;
}

/**
 * Classes that can be restored from JSON implement this.
 */
export interface ConfigurationLoading {
    fromJSON(json: any, context: LoaderContext): void;
    toJSON(): any;
}
