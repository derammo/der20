import { ConfigurationStep } from "derlib/config";

interface Clearable {
    clear();
}

export class ClearCommand extends ConfigurationStep {
    private targets: Clearable[];

    constructor(targets: Clearable[]) {
        super();
        this.targets = targets;
    }

    toJSON() {
        return undefined;
    }

    parse(line: string) {
        // REVISIT: could selectively clear
        console.log('clearing current item selections and session data');
        for (let target of this.targets) {
            target.clear();
        }
        return {};
    }
}