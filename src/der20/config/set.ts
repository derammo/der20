import { ConfigurationStep } from 'der20/config/base';
import { Result } from 'der20/interfaces/result';
import { LoaderContext } from 'der20/interfaces/loader';
import { ParserContext } from 'der20/interfaces/parser';
import { Change } from 'der20/config/result';
import { Collection } from 'der20/interfaces/config';

export class ConfigurationSet extends ConfigurationStep<Set<string>> implements Collection {
    current: Set<string> = new Set<string>();

    constructor() {
        super(undefined);
    }

    toJSON(): any {
        if (this.current.size === 0) {
            // don't persist empty set
            return undefined;
        }
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

    parse(line: string, context: ParserContext): Result {
        this.current.add(line);
        return new Change('item added to collection, if not already present');
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