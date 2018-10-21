import { ConfigurationStep, CollectionItem } from './atoms';
import { ConfigurationParser } from './parser';
import { DefaultConstructed, cloneExcept } from 'derlib/utility';
import { Result } from './result';
import { DialogFactory } from 'derlib/ui';

export class ConfigurationArray<T extends CollectionItem> extends ConfigurationStep<T[]> {
    current: T[] = [];
    ids: {} = {};

    classType: DefaultConstructed<T>;

    constructor(singularName: string, itemClass: DefaultConstructed<T>) {
        super([]);
        this.classType = itemClass;
        this.keyword = singularName;
    }

    toJSON() {
        return this.current;
    }

    parse(line: string): Result.Any {
        let tokens = ConfigurationParser.tokenizeFirst(line);
        if (tokens.length < 2) {
            return new Result.Success();
        }
        let id: string = tokens[0];
        if (id.length < 1) {
            return new Result.Failure(new Error('interactive selection from array is unimplemented'));
        }
        let index: number;
        if (this.ids.hasOwnProperty(id)) {
            index = this.ids[id];
        } else {
            index = this.addItem(id, new (this.classType)());
        }
        return ConfigurationParser.parse(tokens[1], this.current[index]);
    }

    addItem(id: string, item: T) {
        let index = this.current.length;
        item.id = id;
        this.current.push(item);
        this.ids[id] = index;
        return index;
    }

    clone(): ConfigurationArray<T> {
        let copied = new ConfigurationArray<T>(this.keyword, this.classType);
        for (let index = 0; index < this.current.length; index++) {
            copied.addItem(this.current[index].id, cloneExcept(this.classType, this.current[index], ['id']));
        }
        return copied;
    }
}

export class ConfigurationChooser<T extends CollectionItem> extends ConfigurationStep<T> {
    // this id can be used to refer to the most recently selected item
    static readonly MAGIC_CURRENT_ID: string = 'current';

    // this string can be substituted for the command path by the caller
    static readonly MAGIC_COMMAND_STRING: string = 'DER20_MAGIC_COMMAND_STRING';

    current: T = ConfigurationStep.NO_VALUE;
    array: ConfigurationArray<T>;
    selectedId: string;
    path: string;
    dialogFactory: DialogFactory;

    constructor(array: ConfigurationArray<T>, dialogFactory: DialogFactory, path: string) {
        super(ConfigurationStep.NO_VALUE);
        this.array = array;
        this.dialogFactory = dialogFactory;
        this.path = path;
    }

    toJSON() {
        return this.current;
    }

    private createChooserDialog(rest: string): Result.Dialog {
        // we don't know what command word was used to call us, so we let the caller fix it up
        let dialog = new (this.dialogFactory)(ConfigurationChooser.MAGIC_COMMAND_STRING);
        dialog.addTitle('No Current Item Selected');
        dialog.addSeparator();
        dialog.addSubTitle('Please choose an item:')
        dialog.beginControlGroup();
        for (let item of this.array.current) {
            // rerun the same command, with the item id filled in
            dialog.addChoiceControl(this.array.keyword, `${this.path} ${item.id} ${rest}`);
        }
        dialog.endControlGroup();
        return new Result.Dialog(Result.Dialog.Destination.Caller, dialog.render());
    }

    private handleCurrent(rest: string): Result.Any {
        if (this.selectedId != null) {
            // already loaded
            return ConfigurationParser.parse(rest, this.current);
        }
        if (this.array.current.length > 1) {
            // present interactive chooser
            return this.createChooserDialog(rest);
        }
        if (this.array.current.length == 1) {
            // auto select only defined item, if any
            let id = this.array.current[0].id;
            console.log(`${this.array.keyword} ${id} was automatically selected, because it is the only one defined`);
            return this.loadItem(id, rest);
        }
        // remaining case is no items in collection
        return new Result.Failure(new Error(`${this.array.keyword} could not be selected, because none are defined`));
    }

    parse(line: string): Result.Any {
        let tokens = ConfigurationParser.tokenizeFirst(line);
        let id = tokens[0];

        if (id == ConfigurationChooser.MAGIC_CURRENT_ID) {
            return this.handleCurrent(tokens[1]);
        }

        if (id.length < 1) {
            // treat this the same as current, to auto load if applicable
            return this.handleCurrent(tokens[1]);
        }

        if (!this.array.ids.hasOwnProperty(id)) {
            this.current = null;
            this.selectedId = undefined;
            return new Result.Failure(new Error(`item "${id}" is not defined`));
        }

        return this.loadItem(id, tokens[1]);
    }

    private loadItem(id: string, rest: string) {
        let index = this.array.ids[id];
        this.current = cloneExcept(this.array.classType, this.array.current[index], ['id']);
        this.selectedId = id;
        return ConfigurationParser.parse(rest, this.current);
    }

    clear() {
        this.selectedId = undefined;
        this.current = null;
    }
}

