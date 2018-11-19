import { ConfigurationCommand } from 'der20/library';
import { Result } from 'der20/library';
import { ConfigurationFromTemplate } from 'der20/library';
import { ConfigurationParser } from 'der20/library';
import { ParserContext } from 'der20/library';
import { LeagueModule, LeagueModuleDefinition } from './ddal/league_module';

// XXX remove?  confirm that an alias to the actual config item would do the same thing and more
export class TimerCommand extends ConfigurationCommand {
    private module: ConfigurationFromTemplate<LeagueModuleDefinition, LeagueModule>;
    private property: string;

    constructor(module: ConfigurationFromTemplate<LeagueModuleDefinition, LeagueModule>, property: string) {
        super();
        this.module = module;
        this.property = property;
    }

    parse(line: string, context: ParserContext): Result {
        let time = Date.now();
        if (line.length > 0) {
            let offset = parseFloat(line);
            if (offset > 0.0) {
                time -= offset * 60 * 60 * 1000;
            }
        }
        let date = new Date(time);
        return ConfigurationParser.parse(`current ${this.property} ${date.toUTCString()}`, this.module, context);
    }
}
