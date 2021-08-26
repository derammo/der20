import { ConfigurationValueBase } from 'der20/config/base';
import { Result } from 'der20/interfaces/result';
import { LoaderContext } from 'der20/interfaces/loader';
import { ParserContext, ExportContext } from 'der20/interfaces/parser';
import { Change } from 'der20/config/result';
import { ItemRemoval } from 'der20/interfaces/config';

export class ConfigurationSet extends ConfigurationValueBase<Set<string>> implements ItemRemoval {
    currentValue: Set<string> = new Set<string>();

    constructor() {
        super(undefined);
    }

    toJSON(): any {
        if (this.currentValue.size === 0) {
            // don't persist empty set
            return undefined;
        }
        return Array.from(this.currentValue.values());
    }

    fromJSON(json: any, context: LoaderContext) {
        this.currentValue.clear();
        if (!Array.isArray(json)) {
            // ignore, might be schema change we can survive
            context.addMessage('ignoring non-array JSON in saved state; configuration set reset');
            return;
        }
        for (let child of json) {
            this.currentValue.add(child);
        }
    }

    parse(text: string, context: ParserContext): Result {
        this.currentValue.add(text);
        return new Change('item added to collection, if not already present');
    }

    export(context: ExportContext): void {
        for (let item of this.currentValue) {
            context.addRelativeCommand(item);
        }
    }

    removeItem(id: string): boolean {
        return this.currentValue.delete(id);
    }

    clone(): ConfigurationSet {
        let copied = new ConfigurationSet();
        for (let id of this.currentValue) {
            copied.currentValue.add(id);
        }
        return copied;
    }
}