import { ConfigurationStep, ConfigurationCommand } from "derlib/config/atoms";
import { Result } from "derlib/config/result";

interface Clearable {
    clear();
}

export class ClearCommand extends ConfigurationCommand {
    private targets: Clearable[];

    constructor(targets: Clearable[]) {
        super();
        this.targets = targets;
    }

    toJSON() {
        return undefined;
    }

    parse(line: string): Result.Any {
        // REVISIT: could selectively clear
        console.log('clearing current item selections and session data');
        for (let target of this.targets) {
            target.clear();
        }
        return new Result.Success('cleared current session data');
    }
}