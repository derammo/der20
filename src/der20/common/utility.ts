export interface DefaultConstructed<T> {
    new (): T;
}

export interface ValueConstructed<T> {
    new (from: any): T;
}

export interface Clonable {
    clone(): any;
}

export function serializeWithoutNulls(content: any): string {
    return JSON.stringify(content, (key, value) => {
        if (value === null) {
            return undefined;
        }
        return value;
    });
}

export function clone<T>(factory: DefaultConstructed<T>, from: T) {
    return cloneExcept(factory, from, []);
}

export function cloneExcept<T>(
    factory: DefaultConstructed<T>,
    from: T,
    except: string[]
) {
    if (from === undefined) {
        throw new Error(`attempted to clone 'undefined' to class ${factory.name}`);
    }
    let copied = <any>new factory();
    let source = <any>from;
    for (let key of Object.getOwnPropertyNames(from)) {
        if (except.indexOf(key) >= 0) {
            copied[key] = undefined;
            continue;
        }
        let item: any = source[key];
        if (copied[key] !== undefined) {
            // give target a chance to upgrade item class during cloning
            if (typeof copied[key].cloneFrom === 'function') {
                copied[key].cloneFrom(source[key]);
                continue;
            }
        }
        if (item.clone === undefined) {
            throw new Error(`clone function is not implemented on key '${key}' of class ${factory.name}`);
        }
        copied[key] = item.clone();
    }
    return copied;
}

export function escapeHtml(text: string): string {
    return text
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
 }