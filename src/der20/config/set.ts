import { ConfigurationStep } from 'der20/config/base';
import { Result } from 'der20/interfaces/result';
import { LoaderContext } from 'der20/interfaces/loader';
import { ParserContext, ExportContext } from 'der20/interfaces/parser';
import { Change } from 'der20/config/result';
import { ItemRemoval } from 'der20/interfaces/config';

export class ConfigurationSet extends ConfigurationStep<Set<string>> implements ItemRemoval {
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

    parse(text: string, context: ParserContext): Result {
        this.current.add(text);
        return new Change('item added to collection, if not already present');
    }

    export(context: ExportContext): void {
        for (let item of this.current) {
            context.addRelativeCommand(item);
        }
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