import { clone } from 'der20/common/utility';
import { Der20Meta } from './meta';

/**
 * grouping of configuration elements that collapses if all its values are unpopulated
 */
export class ConfigurationIntermediateNode {
    static collapse(target: any): any {
        const meta = Der20Meta.fetch(target.constructor.prototype);
        let result: {[index: string]: any} = {};
        let empty = true;
        for (let key of Object.keys(target)) {
            let child: any = target[key];
            if (typeof child !== 'object') {
                continue;
            }
            if (typeof child.toJSON !== 'function') {
                throw new Error(`intermediate node contains child '${key}' that does not define toJSON function`);
            }
            if (meta === undefined) {
                continue;
            }

            const property = meta.properties[key];
            if (property === undefined) {
                continue;
            } 
            
            if (!property.data) {
                // persistence disabled
                continue;
            } 

            let value: any = child.toJSON();
            if (value !== undefined) {
                result[key] = value;
                empty = false;
            }
        }
        if (empty) {
            return undefined;
        }
        return result;
    }
    clone(): ConfigurationIntermediateNode {
        return clone(ConfigurationIntermediateNode, this);
    }
    toJSON(): any {
        return ConfigurationIntermediateNode.collapse(this);
    }
}