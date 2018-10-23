// grouping of configuration elements that collapses if all its values are unpopulated
export class ConfigurationIntermediateNode {
    toJSON() {
        let result: {[index: string]: any} = {};
        let empty = true;
        for (let key of Object.keys(this)) {
            // intentional crash if element does not define toJSON
            let value = this[key].toJSON();
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
}