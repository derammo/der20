import { ConfigurationContext, interfaceQuery } from "./config";

export interface LoaderContext extends ConfigurationContext {
    // nothing additional for now
}

/**
 * Classes that can be restored from JSON implement this.
 */
export interface ConfigurationLoading {
    fromJSON(json: any, context: LoaderContext): Promise<void>;
    toJSON(): any;
}

// eslint-disable-next-line no-redeclare
export namespace ConfigurationLoading {
    export function query(target: any) {
        return interfaceQuery<ConfigurationLoading>(target, ['fromJSON', 'toJSON']);
    } 
}

