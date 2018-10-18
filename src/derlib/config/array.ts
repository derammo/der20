import { ConfigurationStep, CollectionItem } from './atoms';
import { ConfigurationParser } from './parser';
import { DefaultConstructed } from 'derlib/utility';

export class ConfigurationArray<T extends CollectionItem> extends ConfigurationStep {
    private ids: {} = {};
    items: T[] = [];
    
    classType: DefaultConstructed<T>;

    constructor(singularName: string, itemClass: DefaultConstructed<T>) {
        super();
        this.classType = itemClass;
        this.keyword = singularName;
    }

    public toJSON() {
        return this.items;
    }

    parse(line: string) {
        let tokens = ConfigurationParser.tokenizeFirst(line);
        if (tokens.length < 2) {
            return;
        }
        let id: string = tokens[0];
        let index: number;
        if (this.ids.hasOwnProperty(id)) {
            index = this.ids[id];
        } else {
            index = this.items.length;
            let item = new (this.classType)();
            item.id = id;
            this.items.push(item);
            this.ids[id] = index;
        }
        ConfigurationParser.parse(tokens[1], this.items[index]);
    }
}
