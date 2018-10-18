import { Der20Dialog} from "derlib/ui";
import { ConfigurationParser, ConfigurationArray, CollectionItem, ConfigurationStep, ConfigurationChooser, ConfigurationAlias } from "derlib/config";
import { LeagueModule } from "derlib/ddal/league_module";
import { DungeonMaster } from "derlib/ddal/dungeon_master"

class Definitions {
	modules: ConfigurationArray<LeagueModule> = new ConfigurationArray<LeagueModule>("module", LeagueModule);
	dms: ConfigurationArray<DungeonMaster> = new ConfigurationArray<DungeonMaster>("dm", DungeonMaster);
}

export class Configuration {
   define: Definitions = new Definitions(); 
   dm: ConfigurationChooser<DungeonMaster> = new ConfigurationChooser(this.define.dms);
   module: ConfigurationChooser<LeagueModule> = new ConfigurationChooser(this.define.modules);
   checkpoint: ConfigurationAlias = new ConfigurationAlias(this.module, 'current checkpoint');
}