/**
 * grouping of configuration elements that collapses if all its values are unpopulated
 */
export class ConfigurationIntermediateNode {
    static collapse(target: any): any {
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
    toJSON(): any {
        return ConfigurationIntermediateNode.collapse(this);
    }
}