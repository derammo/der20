import { ConfigurationCommand, CollectionItem } from "./atoms";
import { ConfigurationArray } from "./array";
import { Result } from "./result";
import { ConfigurationParser } from "./parser";

export class ConfigurationDeleteItemCommand<T extends CollectionItem> extends ConfigurationCommand {
    constructor(private array: ConfigurationArray<T>) {
        super();
        // generated code
    }

    parse(line: string): Result.Any {
        const tokens = ConfigurationParser.tokenizeFirst(line);
        const key = tokens[0];
        if (this.array.removeItem(key)) {
            return new Result.Change(`array item ${key} deleted`);
        }
        return new Result.Success(`item ${key} does not exist`);
    }

    collectionItem(): T {
        // this tells our help generator (and potentially others) that
        // this is a collection without any keys past the item id
        return undefined;
    }
}