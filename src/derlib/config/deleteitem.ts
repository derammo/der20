import { ConfigurationCommand, CollectionItem } from "./atoms";
import { ConfigurationArray } from "./array";
import { Result } from "./result";

export class ConfigurationDeleteItemCommand<T extends CollectionItem> extends ConfigurationCommand {
    constructor(private array: ConfigurationArray<T>) {
        super();
        // generated code
    }

    parse(line: string): Result.Any {
        if (this.array.removeItem(line)) {
            return new Result.Change();
        } else {
            return new Result.Failure(new Error(``))
        }
    }
}