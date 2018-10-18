export interface DefaultConstructed<T> {
    new (): T;
}

export interface Clonable {
    clone();
}

export function serializeWithoutNulls(content: any) {
    return JSON.stringify(content, (key, value) => {
        if (value === null) {
            return undefined;
        }
        return value;
    });  
}

export function clone<T>(factory: DefaultConstructed<T>, from: T) {
    let copied = new (factory)();
    for (let key in from) {
        let item:any = from[key];
        copied[key] = item.clone();
    }
    return copied;   
}

export function cloneExcept<T>(factory: DefaultConstructed<T>, from: T, except: [string]) {
    let copied = new (factory)();
    for (let key in from) {
        if (except.indexOf(key) >= 0) {
            copied[key] = undefined;
            continue;
        }
        let item:any = from[key];
        copied[key] = item.clone();
    }
    return copied;   
}

// copied from https://stackoverflow.com/questions/28150967/typescript-cloning-object
export function deepCopy(obj) {
    var copy;

    // Handle the 3 simple types, and null or undefined
    if (null == obj || "object" != typeof obj) return obj;

    // Handle Date
    if (obj instanceof Date) {
        copy = new Date();
        copy.setTime(obj.getTime());
        return copy;
    }

    // Handle Array
    if (obj instanceof Array) {
        copy = [];
        for (var i = 0, len = obj.length; i < len; i++) {
            copy[i] = deepCopy(obj[i]);
        }
        return copy;
    }

    // Handle Object
    if (obj instanceof Object) {
        copy = {};
        for (var attr in obj) {
            if (obj.hasOwnProperty(attr)) copy[attr] = deepCopy(obj[attr]);
        }
        return copy;
    }

    throw new Error("Unable to copy obj! Its type isn't supported.");
}


