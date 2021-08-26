import { Change, Success } from './result';
import { ConfigurationCommand } from 'der20/config/atoms';
import { Result } from 'der20/interfaces/result';
import { ItemRemoval } from 'der20/interfaces/config';

export class ConfigurationDeleteItemCommand<T> extends ConfigurationCommand {
    constructor(private collection: ItemRemoval) {
        super();
    }

    parse(text: string): Result {
        if (this.collection.removeItem(text)) {
            return new Change(`item '${text}' deleted`);
        }
        return new Success(`item '${text}' does not exist`);
    }
}
