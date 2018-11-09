import { ConfigurationStep } from './atoms';
import { LoaderContext } from './context';
import { ConfigurationEventHandler } from './parser';

export class ConfigurationLoader {
    static restore(from: any, to: any, context: LoaderContext): void {
        if (from === undefined) {
            return;
        }
        if (to instanceof ConfigurationStep) {
            to.load(from, context);
            return;
        }
        // iterate objects, recurse
        // tslint:disable-next-line:forin
        for (let key in from) {
            if (to.hasOwnProperty(key)) {
                let target = to[key];
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
        if (to instanceof ConfigurationEventHandler) {
            to.handleLoaded();
        }
    }
}
