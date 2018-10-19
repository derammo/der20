import { ConfigurationStep, CollectionItem } from './atoms';
import { ConfigurationParser } from './parser';
import { DefaultConstructed, cloneExcept } from 'derlib/utility';

export class ConfigurationArray<T extends CollectionItem> extends ConfigurationStep {
    ids: {} = {};
    items: T[] = [];

    classType: DefaultConstructed<T>;

    constructor(singularName: string, itemClass: DefaultConstructed<T>) {
        super();
        this.classType = itemClass;
        this.keyword = singularName;
    }

    toJSON() {
        return this.items;
    }

    parse(line: string) {
        let tokens = ConfigurationParser.tokenizeFirst(line);
        if (tokens.length < 2) {
            return {};
        }
        let id: string = tokens[0];
        if (id.length < 1) {
            return { error: 'interactive selection from array is unimplemented' };
        }
        let index: number;
        if (this.ids.hasOwnProperty(id)) {
            index = this.ids[id];
        } else {
            index = this.addItem(id, new (this.classType)());
        }
        return ConfigurationParser.parse(tokens[1], this.items[index]);
    }

    addItem(id: string, item: T) {
        let index = this.items.length;
        item.id = id;
        this.items.push(item);
        this.ids[id] = index;
        return index;
    }

    clone(): ConfigurationArray<T> {
        let copied = new ConfigurationArray<T>(this.keyword, this.classType);
        for (let index = 0; index < this.items.length; index++) {
            copied.addItem(this.items[index].id, cloneExcept(this.classType, this.items[index], ['id']));
        }
        return copied;
    }
}

export class ConfigurationChooser<T extends CollectionItem> extends ConfigurationStep {
    // this id can be used to refer to the most recently selected item
    static readonly MAGIC_CURRENT_ID: string = 'current';

    array: ConfigurationArray<T>;
    localCopy: T = null;
    selectedId: string

    constructor(array: ConfigurationArray<T>) {
        super();
        this.array = array;
    }

    toJSON() {
        return this.localCopy;
    }

    private handleCurrent(rest: string) {
        if (this.selectedId != null) {
            // already loaded
            return ConfigurationParser.parse(rest, this.localCopy);
        }
        if (this.array.items.length > 1) {
            // present interactive chooser
            return {
                choices: this.array.items.map((item) => {
                    return item.id;
                })
            };
        }
        if (this.array.items.length == 1) {
            // auto select only defined item, if any
            let id = this.array.items[0].id;
            console.log(`${this.array.keyword} ${id} was automatically selected, because it is the only one defined`);
            return this.loadItem(id, rest);
        }
        // remaining case is no items in collection
        return { error: `${this.array.keyword} could not be selected, because none are defined` };
    }

    parse(line: string) {
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
            this.localCopy = null;
            this.selectedId = undefined;
            return { error: `item "${id}" is not defined` };
        }

        return this.loadItem(id, tokens[1]);
    }

    private loadItem(id: string, rest: string) {
        let index = this.array.ids[id];
        this.localCopy = cloneExcept(this.array.classType, this.array.items[index], ['id']);
        this.selectedId = id;
        return ConfigurationParser.parse(rest, this.localCopy);
    }

    clear() {
        this.selectedId = undefined;
        this.localCopy = null;
    }
}

