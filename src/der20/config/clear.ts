import { ConfigurationSimpleCommand } from 'der20/config/atoms';
import { Change } from 'der20/config/result';
import { ParserContext } from 'der20/interfaces/parser';
import { Result } from 'der20/interfaces/result';

export interface Clearable {
    clear(): void;
}

export class ClearCommand extends ConfigurationSimpleCommand {
    private targets: Clearable[];

    constructor(targets: Clearable[], private message: string) {
        super();
        this.targets = targets;
    }

    handleEndOfCommand(context: ParserContext): Result {
        // REVISIT: could support selectively clearing by keyword
        for (let target of this.targets) {
            target.clear();
        }
        return new Change(this.message);
    }
}
