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
            return new Result.Change();
        }
        console.log(`item ${key} does not exist`);
        return new Result.Success();
    }
}