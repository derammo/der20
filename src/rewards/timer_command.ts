import { ConfigurationCommand } from "derlib/config/atoms";
import { LeagueModule } from "derlib/ddal/league_module";
import { Result } from "derlib/config/result";
import { ConfigurationChooser } from "derlib/config/array";
import { ConfigurationParser } from "derlib/config/parser";
import { ParserContext } from "derlib/config/context";

// XXX remove?  confirm that an alias to the actual config item would do the same thing and more
export class TimerCommand extends ConfigurationCommand {
    private module: ConfigurationChooser<LeagueModule>;
    private property: string;

    constructor(module: ConfigurationChooser<LeagueModule>, property: string) {
        super();
        this.module = module;
        this.property = property;
    }

    toJSON(): any {
        return undefined;
    }

    parse(line: string, context: ParserContext): Result.Any {
        let time = Date.now();
        if (line.length > 0) {
            let offset = parseFloat(line);
            if (offset > 0.0) {
                time -= (offset * 60 * 60 * 1000);
            }
        }
        let date = new Date(time);
        return ConfigurationParser.parse(`current ${this.property} ${date.toUTCString()}`, this.module, context);
    }
}
