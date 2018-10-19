import { ConfigurationAlias, ConfigurationArray, ConfigurationChooser, ConfigurationParser, ConfigurationStep } from "derlib/config";
import { DungeonMaster } from "derlib/ddal/dungeon_master";
import { LeagueModule } from "derlib/ddal/league_module";
import { TimerCommand } from "./timer_command";
import { ClearCommand } from "./clear_command";
import { SendCommand } from "./send_command";
import { ShowCommand } from "./show_command";

class Definitions {
    modules: ConfigurationArray<LeagueModule> = new ConfigurationArray<LeagueModule>("module", LeagueModule);
    dms: ConfigurationArray<DungeonMaster> = new ConfigurationArray<DungeonMaster>("dm", DungeonMaster);
}

export class Configuration {
    define: Definitions = new Definitions();
    dm: ConfigurationChooser<DungeonMaster> = new ConfigurationChooser(this.define.dms);
    module: ConfigurationChooser<LeagueModule> = new ConfigurationChooser(this.define.modules);
    checkpoint: ConfigurationAlias = new ConfigurationAlias(this.module, 'current checkpoint');
    start: TimerCommand = new TimerCommand(this.module, 'start');
    stop: TimerCommand = new TimerCommand(this.module, 'stop');
    clear: ClearCommand = new ClearCommand([this.dm, this.module]);
    show: ShowCommand = new ShowCommand(this.dm, this.module);
    send: SendCommand = new SendCommand(this.dm, this.module);
}