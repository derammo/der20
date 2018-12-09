import { Change, Success } from './result';
import { ConfigurationCommand } from 'der20/config/atoms';
import { Result } from 'der20/interfaces/result';
import { ItemRemoval } from 'der20/interfaces/config';

export class ConfigurationDeleteItemCommand<T> extends ConfigurationCommand {
    constructor(private collection: ItemRemoval) {
        super();
        // generated code
    }

    parse(line: string): Result {
        if (this.collection.removeItem(line)) {
            return new Change(`item '${line}' deleted`);
        }
        return new Success(`item '${line}' does not exist`);
    }
}
