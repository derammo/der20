import { ConfigurationStep, Collection } from './atoms';
import { Result } from './result';
import { ParserContext, LoaderContext } from './context';

export class ConfigurationSet extends ConfigurationStep<Set<string>> implements Collection {
    current: Set<string> = new Set<string>();

    constructor() {
        super(undefined);
    }

    toJSON(): any {
        return Array.from(this.current.values());
    }

    load(json: any, context: LoaderContext) {
        this.current.clear();
        if (!Array.isArray(json)) {
            // ignore, might be schema change we can survive
            context.addMessage('ignoring non-array JSON in saved state; configuration set reset');
            return;
        }
        for (let child of json) {
            this.current.add(child);
        }
    }

    parse(line: string, context: ParserContext): Result.Any {
        this.current.add(line);
        return new Result.Change('item added to set, if not already presnt');
    }

    removeItem(id: string): boolean {
        return this.current.delete(id);
    }

    clone(): ConfigurationSet {
        let copied = new ConfigurationSet();
        for (let id of this.current) {
            copied.current.add(id);
        }
        return copied;
    }
}