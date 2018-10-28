import { ConfigurationStep } from './atoms';
import { LoaderContext } from './context';

export class ConfigurationLoader {
    static restore(from: any, to: any, context: LoaderContext): void {
        if (from === undefined) {
            console.log('nothing to restore from key that is not present in JSON');
            return;
        }
        if (to instanceof ConfigurationStep) {
            // console.log(`restoring configuration step from '${JSON.stringify(from)}'`)
            to.load(from, context);
            return;
        }
        // iterate objects, recurse
        // tslint:disable-next-line:forin
        for (let key in from) {
            console.log(`checking key '${key}'`);
            if (to.hasOwnProperty(key)) {
                console.log(`restoring property '${key}'`);
                let target = to[key];
                if (target !== null && typeof target === 'object') {
                    ConfigurationLoader.restore(from[key], target, context);
                } else {
                    // treat as dumb data
                    console.log(`set ${key} as raw data`);
                    to[key] = from[key];
                }
            } else {
                console.log(`ignoring JSON property '${key}' that does not appear in configuration tree`);
            }
        }
    }
}
