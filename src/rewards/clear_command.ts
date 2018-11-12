import { ConfigurationSimpleCommand } from "derlib/config/atoms";
import { Result } from "derlib/config/result";
import { ParserContext } from "derlib/config/context";

export interface Clearable {
    clear(): void;
}

export class ClearCommand extends ConfigurationSimpleCommand {
    private targets: Clearable[];

    constructor(targets: Clearable[]) {
        super();
        this.targets = targets;
    }

    handleEndOfCommand(context: ParserContext): Result.Any {
        // REVISIT: could selectively clear
        debug.log('clearing current item selections and session data');
        for (let target of this.targets) {
            target.clear();
        }
        return new Result.Success('cleared current session data');
    }
}