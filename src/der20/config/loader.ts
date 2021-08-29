import { ConfigurationLoading, LoaderContext } from 'der20/interfaces/loader';
import { ConfigurationChangeHandling } from 'der20/interfaces/config';

export class ConfigurationLoader {
    static restore(from: any, to: any, context: LoaderContext): Promise<void> {
        if (from === undefined) {
            // nothing to do
            return Promise.resolve();
        }
        
        const configurationLoading = ConfigurationLoading.query(to);
        if (configurationLoading.supported) {
            // object does its own JSON processing
            return configurationLoading.interface.fromJSON(from, context);
        }
        
        // accumulate changes
        let changes = ConfigurationLoader.buildChanges(from, to, context);

        // barrier: restore all data, then call all change handlers
        return Promise.all(changes.promises)
            .then((_results: void[]) => {
                return ConfigurationLoader.notifyChangesIfSupported(to, context, changes.keys);
            });
    }

    private static buildChanges(from: any, to: any, context: LoaderContext): { promises: Promise<void>[], keys: string[] } {
        let changedKeys: string[] = [];
        let changes: Promise<void>[] = [];

        // eslint-disable-next-line guard-for-in
        for (let key in from) {
            if (to.hasOwnProperty(key)) {
                let target = to[key];
                changedKeys.push(key);
                if (target !== null && typeof target === 'object') {
                    changes.push(ConfigurationLoader.restore(from[key], target, context));
                } else {
                    // treat as dumb data
                    to[key] = from[key];
                }
            } else {
                console.log(`ignoring JSON property '${key}' from '${JSON.stringify(from)}' that does not appear in configuration tree`);
            }
        }
        return { promises: changes, keys: changedKeys };
    }

    static notifyChangesIfSupported(to: any, context: LoaderContext, changedKeys: string[]): Promise<void> {
        // change handling support is optional
        const changeHandling = ConfigurationChangeHandling.query(to);
        if (!changeHandling.supported) {
            return Promise.resolve();
        }
        return ConfigurationLoader.notifyChanges(changeHandling.interface, context, changedKeys);
    }

    private static notifyChanges(changeHandling: ConfigurationChangeHandling, context: LoaderContext, changedKeys: string[]): Promise<void> {
        // trigger all change listeners
        context.swapIn();
        let notifications: Promise<void>[] = [];
        for (let key of changedKeys) {
            debug.log(`loader change event for '${key}' on '${changeHandling.constructor.name}'`);
            notifications.push(changeHandling.handleChange(key));
        }

        // reap all notification operations into a single result
        return Promise.all(notifications)
            .then(() => {
                return; 
            });
    }
}
