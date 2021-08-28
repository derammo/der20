import { ConfigurationParser } from './parser';
import { DefaultConstructed, cloneExcept } from 'der20/common/utility';
import { DialogResult, Change, Failure, Success } from './result';
import { ConfigurationLoader } from './loader';
import { ConfigurationValueBase } from 'der20/config/base';
import { ExportContext, ParserContext } from 'der20/interfaces/parser';
import { Result } from 'der20/interfaces/result';
import { CollectionItem, Collection, ConfigurationValue } from 'der20/interfaces/config';
import { LoaderContext } from 'der20/interfaces/loader';

export class ConfigurationArray<T extends CollectionItem> extends ConfigurationValueBase<T[]> implements Collection {
    private idToIndex: { [index: string]: number } = {};
    classType: DefaultConstructed<T>;
    keyword: string;

    // this token can be provided after the id token in order to delete an item from the collection 
    // without having to use a delete command prefix
    static readonly deleteCommandSuffix: string = '--delete';

    constructor(singularName: string, itemClass: DefaultConstructed<T>) {
        super(undefined, 'ID');
        this.currentValue = [];
        this.classType = itemClass;
        this.keyword = singularName;
    }

    toJSON(): any {
        // don't persist if empty
        if (this.value().length === 0) {
            return undefined;
        }
        return this.value();
    }

    clear() {
        this.currentValue = [];
        this.idToIndex = {};
    }

    fromJSON(json: any, context: LoaderContext): Promise<void> {
        this.clear();
        if (!Array.isArray(json)) {
            // ignore, might be schema change we can survive
            debug.log('ignoring non-array JSON in saved state; configuration array reset');
            return Promise.resolve();
        }
        let childRestoreOperations: Promise<void>[] = [];
        // eslint-disable-next-line guard-for-in
        for (let jsonItem of json) {
            let item = new this.classType();
            childRestoreOperations.push(
                ConfigurationLoader.restore(jsonItem, item, context)
                .then(() => {
                    context.swapIn();
                    if (this.findItem(item.id) !== undefined) {
                        console.log(`error: id '${item.id}' is already in collection and cannot be restored`);
                        return;
                    }
                    this.addItem(item.id, item);
                }));
        }
        return Promise.all(childRestoreOperations)
            .then((_results: void[]) => {
                return Promise.resolve();
            })
    }

    addItem(id: string, item: T) {
        item.id = id;
        let index = this.value().length;
        this.value().push(item);
        this.idToIndex[id] = index;
        return index;
    }

    removeItem(id: string): boolean {
        let index = this.idToIndex[id];
        if (index === undefined) {
            return false;
        }
        delete this.idToIndex[id];
        let removed = this.value().splice(index, 1);
        // recreate index for moved items
        for (let i=index; i<this.value().length; i++) {
            this.idToIndex[this.value()[i].id] = i;
        }
        if (removed[0].id !== id) {
            throw new Error('broken implementation: item removed was not one selected');
        }
        debug.log(`collection after remove: ${this.value().map((item) => { return item.id })}`);
        return true;
    }

    findItem(id: string): number | undefined {
        return this.idToIndex[id];
    }

    fetchItem(id: string): CollectionItem | undefined {
        const index = this.findItem(id);
        if (index === undefined) {
            return undefined;
        }
        return this.value()[index];
    }

    [Symbol.iterator](): Iterator<T> {
        return this.value()[Symbol.iterator]();
    }    

    parse(text: string, context: ParserContext): Promise<Result> {
        let tokens = ConfigurationParser.tokenizeFirst(text);
        let id: string = tokens[0];
        if (id.length < 1) {
            return this.createItemChoiceDialog(context);
        }
        if (id === ConfigurationArrayReference.magicCurrentId) {
            return new Failure(new Error(`${id} is a reserved word referring to a currently selected item and cannot be used as an ID`)).resolve();
        }
        if (tokens[1] === ConfigurationArray.deleteCommandSuffix) {
            if (this.removeItem(id)) {
                return new Change(`removed item ${id}`).resolve();
            } else {
                // this is ok, we might just be cleaning up before reconfiguring
                return new Success(`item ${id} does not exist in collection`).resolve();
            }
        }
        let index = this.findItem(id);
        if (index !== undefined) {
            return ConfigurationParser.parse(tokens[1], this.value()[index], context);
        } else {
            index = this.addItem(id, new this.classType());
            return ConfigurationParser.parse(tokens[1], this.value()[index], context)
            .then((result: Result) => {
                context.swapIn();
                result.messages.unshift(`created item ${id}`);
                result.events.add(Result.Event.change);
                return result;
            })
        }
    }

    export(context: ExportContext): void {
        for (let item of this.value()) {
            context.push(item.id);
            ConfigurationParser.export(item, context);
            context.pop();
        }
    }

    collectionItem(): DefaultConstructed<T> {
        return this.classType;
    }

    clone(): ConfigurationArray<T> {
        let copied = new ConfigurationArray<T>(this.keyword, this.classType);
        for (let index = 0; index < this.value().length; index++) {
            copied.addItem(this.value()[index].id, cloneExcept(this.classType, this.value()[index], ['id']));
        }
        return copied;
    }

    /**
     * @param source array of items to clone, potentially changing their type to our element type
     */
    cloneFrom(source: any) {
        this.currentValue = [];
        this.idToIndex = {};
        if (source === undefined) {
            throw new Error('undefined property used as source of cloning operation; logic error');
        }
        if (source.currentValue === undefined) {
            // this could happen if we call this function with the wrong sort of object
            throw new Error('undefined current value as source of cloning operation; logic error');
        }
        if (!Array.isArray(source.currentValue)) {
            // this could happen if we call this function with the wrong sort of object
            throw new Error('non-array current value used as source of cloning operation; logic error');
        }
        for (let item of source.currentValue) {
            if (item.id === undefined) {
                throw new Error('attempt to clone an array of items that are not of type CollectionItem; logic error');
            }
            this.addItem(item.id, cloneExcept(this.classType, item, ['id']));
        }
    }

    private createItemChoiceDialog(context: ParserContext): Promise<DialogResult> {
        let dialog = new context.dialog();
        dialog.addTitle(`Selection for '${this.keyword}'`);
        dialog.addSeparator();
        dialog.addSubTitle('Please choose an item:');
        const link = { command: context.command }
        dialog.addChoiceControlGroup(this.keyword, context.rest, this.value(), link);
        return Promise.resolve(new DialogResult(DialogResult.Destination.caller, dialog.render()));
    }
}

class ConfigurationArrayReference<FROM extends CollectionItem, TO extends FROM> extends ConfigurationValueBase<TO> {
    // this id can be used to refer to the most recently selected item
    static readonly magicCurrentId: string = 'current';
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
            let source: any = this.value();
            if (typeof source.toJSON === 'function') {
                source = source.toJSON();
            }
            Object.assign(result, source);
        }
        result.id = this.selectedId;
        return result;
    }

    fromJSON(json: any, context: LoaderContext): Promise<void> {
        this.selectedId = json.id;
        // now we wait until this object is used, because the array may not have loaded yet
        // NOTE: any per-session overrides are now lost
        debug.log('restored selection from array');
        return Promise.resolve();
    }

    createChooserDialog(rest: string, context: ParserContext, followUps?: string[]): Promise<DialogResult> {
        // we don't know what command word was used to call us, so we let the caller fix it up
        let dialog = new context.dialog();
        const link = { command: context.command, followUps: followUps, suffix: rest };
        dialog.addTitle(`Selection for '${this.path}'`);
        dialog.addSeparator();
        dialog.addSubTitle('Please choose an item:');
        dialog.addChoiceControlGroup(this.array.keyword, this.path, this.array.value(), link);
        return Promise.resolve(new DialogResult(DialogResult.Destination.caller, dialog.render()));
    }

    handleCurrent(rest: string, context: ParserContext, followUps?: string[]): Promise<Result> {
        if (this.selectedId !== undefined) {
            if (!this.hasConfiguredValue()) {
                // right after restoring from JSON, the item data has not been loaded yet
                return this.loadItem(this.selectedId, rest, context);
            }
            return ConfigurationParser.parse(rest, this.currentValue, context);
        }
        if (this.array.value().length > 1) {
            // present interactive chooser
            return this.createChooserDialog(rest, context, followUps);
        }
        if (this.array.value().length === 1) {
            // auto select only defined item, if any
            let id = this.array.value()[0].id;
            return this.loadItem(id, rest, context)
            .then((result: Result) => {
                context.swapIn();
                result.messages.unshift(`${this.array.keyword} ${id} was automatically selected, because it is the only one defined`);
                return result;
            });
        }
        // remaining case is no items in collection
        return new Failure(new Error(`${this.array.keyword} could not be selected, because none are defined`)).resolve();
    }

    parse(text: string, context: ParserContext): Promise<Result> {
        let tokens = ConfigurationParser.tokenizeFirst(text);
        let id = tokens[0];

        if (id === ConfigurationChooser.magicCurrentId) {
            return this.handleCurrent(tokens[1], context);
        }

        if (id.length < 1) {
            // treat this the same as current, to auto load if applicable
            return this.handleCurrent(tokens[1], context);
        }

        if (this.array.findItem(id) === undefined) {
            this.clear();
            return new Failure(new Error(`item "${id}" is not defined`)).resolve();
        }

        return this.loadItem(id, tokens[1], context);
    }

    export(context: ExportContext): void {
        // REVISIT: is there a use case for exporting the ephemeral state of our selected item?
        if (this.selectedId !== undefined) {
            context.addRelativeCommand(this.selectedId);
        }
    }
    
    private loadItem(id: string, rest: string, context: ParserContext): Promise<Result> {
        let index = this.array.findItem(id);
        this.currentValue = cloneExcept(this.classType, this.array.value()[index], ['id']);
        this.selectedId = id;
        if (rest.length < 1) {
            return new Change(`selected item ${this.value().name.value() || id}`).resolve();
        }
        return ConfigurationParser.parse(rest, this.value(), context);
    }

    clear() {
        this.selectedId = undefined;
        super.clear();
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