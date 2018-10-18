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
            console.log('WARNING: interactive selection from array is unimplemented');
            return {};
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
        for (let index = 0; index<this.items.length; index++) {
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

    parse(line: string) {
        let tokens = ConfigurationParser.tokenizeFirst(line);
        let id = tokens[0];
        if ((id.length < 1) && (this.array.items.length > 1)) {
            // present interactive chooser
            return { choices: this.array.items.map((item) => { 
                return item.id; 
            })};    
        }

        if ((id.length < 1) || ((id == ConfigurationChooser.MAGIC_CURRENT_ID) && (this.selectedId == null))) {
            // auto select only defined item, if any
            if (this.array.items.length == 1) {
                id = this.array.items[0].id;
                console.log(`${this.array.keyword} ${id} was automatically selected, because it is the only one defined`);
            }
        }

        if ((id != ConfigurationChooser.MAGIC_CURRENT_ID) && (id != this.selectedId)) {
            if (!this.array.ids.hasOwnProperty(id)) {
                this.localCopy = null;
                this.selectedId = undefined;
                return { error: `item "${id}" is not defined` };
            }
            let index = this.array.ids[id];
            this.localCopy = cloneExcept(this.array.classType, this.array.items[index], ['id']);
            this.selectedId = id;
        }
        if (!this.localCopy) {
            throw new Error("logic error: local copy does not exist");
        }
        
        // process remaining input against copy
        return ConfigurationParser.parse(tokens[1], this.localCopy);
    }
}

