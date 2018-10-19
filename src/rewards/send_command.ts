import { ConfigurationStep, ConfigurationChooser } from "derlib/config";
import { LeagueModule } from "derlib/ddal/league_module";
import { DungeonMaster } from "derlib/ddal/dungeon_master";

export class SendCommand extends ConfigurationStep {
    private dm: ConfigurationChooser<DungeonMaster>;
    private module: ConfigurationChooser<LeagueModule>;

    constructor(dm: ConfigurationChooser<DungeonMaster>, module: ConfigurationChooser<LeagueModule>) {
        super();
        this.dm = dm;
        this.module = module;
    }

    toJSON() {
        return undefined;
    }

    parse(line: string) {
        return { error: 'send command is unimplemented'};
    }
}