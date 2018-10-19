import { ConfigurationChooser, ConfigurationStep, ConfigurationParser } from "derlib/config";
import { LeagueModule } from "derlib/ddal/league_module";

export class TimerCommand extends ConfigurationStep {
    private module: ConfigurationChooser<LeagueModule>;
    private property: string;

    constructor(module: ConfigurationChooser<LeagueModule>, property: string) {
        super();
        this.module = module;
        this.property = property;
    }

    toJSON() {
        return undefined;
    }

    parse(line: string) {
        let time = Date.now();
        if (line.length > 0) {
            let offset = parseFloat(line);
            if (offset > 0.0) {
                time -= (offset * 60 * 60 * 1000);
            }
        }
        let date = new Date(time);
        ConfigurationParser.parse(`current ${this.property} ${date.toUTCString()}`, this.module);
        return {};
    }
}
