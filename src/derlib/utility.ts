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
    let copied = new factory();
    /* tslint:disable-next-line forin */
    for (let key in from) {
        let item: any = from[key];
        if (item.clone === undefined) {
            throw new Error(`clone function is not implemented on key '${key}' of class ${factory.name}`);
        }
        copied[key] = item.clone();
    }
    return copied;
}

export function cloneExcept<T>(
    factory: DefaultConstructed<T>,
    from: T,
    except: string[]
) {
    let copied = new factory();
    /* tslint:disable-next-line forin */
    for (let key in from) {
        if (except.indexOf(key) >= 0) {
            copied[key] = undefined;
            continue;
        }
        let item: any = from[key];
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