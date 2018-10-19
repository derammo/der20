export interface DefaultConstructed<T> {
    new(): T;
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
        let item: any = from[key];
        copied[key] = item.clone();
    }
    return copied;
}

export function cloneExcept<T>(factory: DefaultConstructed<T>, from: T, except: string[]) {
    let copied = new (factory)();
    for (let key in from) {
        if (except.indexOf(key) >= 0) {
            copied[key] = undefined;
            continue;
        }
        let item: any = from[key];
        copied[key] = item.clone();
    }
    return copied;
}