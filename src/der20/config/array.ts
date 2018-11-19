import { ConfigurationParser } from './parser';
import { DefaultConstructed, cloneExcept } from 'der20/common/utility';
import { DialogResult, Change, Failure } from './result';
import { ConfigurationLoader } from './loader';
import { ConfigurationStep } from 'der20/config/base';
import { LoaderContext } from 'der20/interfaces/loader';
import { ParserContext } from 'der20/interfaces/parser';
import { Result } from 'der20/interfaces/result';
import { CollectionItem, Collection, ConfigurationValue } from 'der20/interfaces/config';

export class ConfigurationArray<T extends CollectionItem> extends ConfigurationStep<T[]> implements Collection {
    current: T[] = [];
    private idToIndex: { [index: string]: number } = {};
    classType: DefaultConstructed<T>;
    keyword: string;

    constructor(singularName: string, itemClass: DefaultConstructed<T>) {
        super([], 'ID');
        this.classType = itemClass;
        this.keyword = singularName;
    }

    toJSON(): any {
        // don't persist if empty
        if (this.current.length === 0) {
            return undefined;
        }
        return this.current;
    }

    clear() {
        this.current = [];
        this.idToIndex = {};
    }

    load(json: any, context: LoaderContext) {
        this.clear();
        if (!Array.isArray(json)) {
            // ignore, might be schema change we can survive
            context.addMessage('ignoring non-array JSON in saved state; configuration array reset');
            return;
        }
        // tslint:disable-next-line:forin
        for (let jsonItem of json) {
            let item = new this.classType();
            ConfigurationLoader.restore(jsonItem, item, context);
            if (this.findItem(item.id) !== undefined) {
                console.log(`error: id '${item.id}' is already in collection and cannot be restored`);
                continue;
            }
            this.addItem(item.id, item);
        }
    }

    addItem(id: string, item: T) {
        item.id = id;
        let index = this.current.length;
        this.current.push(item);
        this.idToIndex[id] = index;
        return index;
    }

    removeItem(id: string): boolean {
        let index = this.idToIndex[id];
        if (index === undefined) {
            return false;
        }
        delete this.idToIndex[id];
        let removed = this.current.splice(index, 1);
        // recreate index for moved items
        for (let i=index; i<this.current.length; i++) {
            this.idToIndex[this.current[i].id] = i;
        }
        if (removed[0].id !== id) {
            throw new Error('broken implementation: item removed was not one selected');
        }
        debug.log(`collection after remove: ${this.current.map((item) => { return item.id })}`);
        return true;
    }

    findItem(id: string): number | undefined {
        return this.idToIndex[id];
    }

    parse(line: string, context: ParserContext): Result {
        let tokens = ConfigurationParser.tokenizeFirst(line);
        let id: string = tokens[0];
        if (id.length < 1) {
            return this.createItemChoiceDialog(context);
        }
        let index = this.findItem(id);
        if (index !== undefined) {
            return ConfigurationParser.parse(tokens[1], this.current[index], context);
        } else {
            index = this.addItem(id, new this.classType());
            let result = ConfigurationParser.parse(tokens[1], this.current[index], context);
            result.messages.unshift(`created item ${id}`);
            return result;
        }
    }

    collectionItem(): DefaultConstructed<T> {
        return this.classType;
    }

    clone(): ConfigurationArray<T> {
        let copied = new ConfigurationArray<T>(this.keyword, this.classType);
        for (let index = 0; index < this.current.length; index++) {
            copied.addItem(this.current[index].id, cloneExcept(this.classType, this.current[index], ['id']));
        }
        return copied;
    }

    private createItemChoiceDialog(context: ParserContext): DialogResult {
        let dialog = new context.dialog();
        dialog.addTitle(`Selection for '${this.keyword}'`);
        dialog.addSeparator();
        dialog.addSubTitle('Please choose an item:');
        const link = { command: context.command }
        dialog.addChoiceControlGroup(this.keyword, context.rest, this.current, link);
        return new DialogResult(DialogResult.Destination.Caller, dialog.render());
    }
}

class ConfigurationArrayReference<FROM extends CollectionItem, TO extends FROM> extends ConfigurationStep<TO> {
    // this id can be used to refer to the most recently selected item
    static readonly MAGIC_CURRENT_ID: string = 'current';

    current: TO = ConfigurationValue.UNSET;
    selectedId: string;

    constructor(public array: ConfigurationArray<FROM>, public path: string, public classType: DefaultConstructed<TO>) {
        super(ConfigurationValue.UNSET, 'ID/current');
        // generated code
    }

    collectionItem(): DefaultConstructed<TO> {
        return this.classType;
    }

    toJSON(): any {
        // don't persist if unset
        if (this.selectedId === undefined) {
            return undefined;
        }

        // shallow copy so we can overwrite id (must not be changed)
        let result: any = {};
        if (this.hasConfiguredValue()) {
            let source: any = this.current;
            if (typeof source.toJSON === 'function') {
                source = source.toJSON();
            }
            Object.assign(result, source);
        }
        result.id = this.selectedId;
        return result;
    }


    load(json: any, context: LoaderContext): Result {
        this.selectedId = json.id;
        // now we wait until this object is used, because the array may not have loaded yet
        // NOTE: any per-session overrides are now lost
        return new Change('restored selection from array');
    }

    createChooserDialog(rest: string, context: ParserContext, followUps?: string[]): DialogResult {
        // we don't know what command word was used to call us, so we let the caller fix it up
        let dialog = new context.dialog();
        const link = { command: context.command, followUps: followUps, suffix: rest };
        dialog.addTitle(`Selection for '${this.path}'`);
        dialog.addSeparator();
        dialog.addSubTitle('Please choose an item:');
        dialog.addChoiceControlGroup(this.array.keyword, this.path, this.array.current, link);
        return new DialogResult(DialogResult.Destination.Caller, dialog.render());
    }

    handleCurrent(rest: string, context: ParserContext, followUps?: string[]): Result {
        if (this.selectedId !== undefined) {
            if (this.current === ConfigurationValue.UNSET) {
                // right after restoring from JSON, the item data has not been loaded yet
                return this.loadItem(this.selectedId, rest, context);
            }
            return ConfigurationParser.parse(rest, this.current, context);
        }
        if (this.array.current.length > 1) {
            // present interactive chooser
            return this.createChooserDialog(rest, context, followUps);
        }
        if (this.array.current.length === 1) {
            // auto select only defined item, if any
            let id = this.array.current[0].id;
            let result = this.loadItem(id, rest, context);
            result.messages.unshift(`${this.array.keyword} ${id} was automatically selected, because it is the only one defined`);
            return result;
        }
        // remaining case is no items in collection
        return new Failure(new Error(`${this.array.keyword} could not be selected, because none are defined`));
    }

    parse(line: string, context: ParserContext): Result {
        let tokens = ConfigurationParser.tokenizeFirst(line);
        let id = tokens[0];

        if (id === ConfigurationChooser.MAGIC_CURRENT_ID) {
            return this.handleCurrent(tokens[1], context);
        }

        if (id.length < 1) {
            // treat this the same as current, to auto load if applicable
            return this.handleCurrent(tokens[1], context);
        }

        if (this.array.findItem(id) === undefined) {
            this.clear();
            return new Failure(new Error(`item "${id}" is not defined`));
        }

        return this.loadItem(id, tokens[1], context);
    }

    private loadItem(id: string, rest: string, context: ParserContext): Result {
        let index = this.array.findItem(id);
        this.current = cloneExcept(this.classType, this.array.current[index], ['id']);
        this.selectedId = id;
        if (rest.length < 1) {
            return new Change(`selected item ${this.current.name.value() || id}`);
        }
        return ConfigurationParser.parse(rest, this.current, context);
    }

    clear() {
        this.selectedId = undefined;
        this.current = ConfigurationValue.UNSET;
    }
}

export class ConfigurationChooser<T extends CollectionItem> extends ConfigurationArrayReference<T, T> {
    constructor(public array: ConfigurationArray<T>, public path: string) {
        super(array, path, array.classType);
    }
}


export class ConfigurationFromTemplate<TEMPLATE extends CollectionItem, INSTANCE extends TEMPLATE> extends ConfigurationArrayReference<TEMPLATE, INSTANCE> {
    // no additional code
}