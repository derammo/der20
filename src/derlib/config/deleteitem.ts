import { ConfigurationCommand, Collection } from "./atoms";
import { Result } from "./result";

export class ConfigurationDeleteItemCommand<T> extends ConfigurationCommand {
    constructor(private collection: Collection) {
        super();
        // generated code
    }

    parse(line: string): Result.Any {
        if (this.collection.removeItem(line)) {
            return new Result.Change(`item '${line}' deleted`);
        }
        return new Result.Success(`item '${line}' does not exist`);
    }
}