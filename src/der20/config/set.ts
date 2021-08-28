import { ConfigurationValueBase } from 'der20/config/base';
import { Change } from 'der20/config/result';
import { ItemRemoval } from 'der20/interfaces/config';
import { ExportContext, ParserContext } from 'der20/interfaces/parser';
import { Result } from 'der20/interfaces/result';

export class ConfigurationSet extends ConfigurationValueBase<Set<string>> implements ItemRemoval {
    constructor() {
        super(undefined, 'ID');
        this.currentValue = new Set();
    }

    toJSON(): any {
        if (this.value().size === 0) {
            // don't persist empty set
            return undefined;
        }
        return Array.from(this.value().values());
    }

    fromJSON(json: any): Promise<void> {
        this.value().clear();
        if (!Array.isArray(json)) {
            // ignore, might be schema change we can survive
            debug.log('ignoring non-array JSON in saved state; configuration set reset');
            return Promise.resolve();
        }
        for (let child of json) {
            this.value().add(child);
        }
        return Promise.resolve();
    }

    parse(text: string, context: ParserContext): Promise<Result> {
        this.value().add(text);
        return new Change('item added to collection, if not already present').resolve();
    }

    export(context: ExportContext): void {
        for (let item of this.value()) {
            context.addRelativeCommand(item);
        }
    }

    removeItem(id: string): boolean {
        return this.value().delete(id);
    }

    clone(): ConfigurationSet {
        let copied = new ConfigurationSet();
        for (let id of this.value()) {
            copied.value().add(id);
        }
        return copied;
    }
}