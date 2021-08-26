import { LoaderContext, ConfigurationLoading } from 'der20/interfaces/loader';
import { ConfigurationChangeHandling } from 'der20/interfaces/config';

export class ConfigurationLoader {
    static restore(from: any, to: any, context: LoaderContext): void {
        if (from === undefined) {
            return;
        }
        if (typeof to.load === 'function') {
            const loading = <ConfigurationLoading>to;
            loading.fromJSON(from, context);
            return;
        }
        // iterate objects, recurse
        let changedKeys: string[] = [];
        // eslint-disable-next-line guard-for-in
        for (let key in from) {
            if (to.hasOwnProperty(key)) {
                let target = to[key];
                changedKeys.push(key);
                if (target !== null && typeof target === 'object') {
                    ConfigurationLoader.restore(from[key], target, context);
                } else {
                    // treat as dumb data
                    to[key] = from[key];
                }
            } else {
                console.log(`ignoring JSON property '${key}' that does not appear in configuration tree`);
            }
        }
        // trigger all change listeners
        for (let key of changedKeys) {
            if (typeof to.handleChange === 'function') {
                let target = <ConfigurationChangeHandling>to;
                debug.log(`loader change event for '${key}' on '${target.constructor.name}'`);
                target.handleChange(key);
            }
        }
    }
}
