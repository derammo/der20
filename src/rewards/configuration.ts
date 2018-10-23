import { ConfigurationStep, ConfigurationFloat, ConfigurationCommand } from 'derlib/config/atoms';
import { DungeonMaster } from 'derlib/ddal/dungeon_master';
import { LeagueModule } from 'derlib/ddal/league_module';
import { TimerCommand } from './timer_command';
import { ClearCommand } from './clear_command';
import { SendCommand } from './send_command';
import { ShowCommand } from './show_command';
import { Der20Dialog } from 'derlib/roll20/dialog';
import { clone, DefaultConstructed } from 'derlib/utility';
import { ConfigurationArray, ConfigurationChooser } from 'derlib/config/array';
import { ConfigurationDeleteItemCommand } from 'derlib/config/deleteitem';
import { ConfigurationAlias } from 'derlib/config/alias';
import { Rules } from './rules';
import { HandoutsOptions } from 'derlib/roll20/handouts';
import { Options } from 'derlib/roll20/options';

class Definitions {
    rules: Rules = new Rules();
    modules: ConfigurationArray<LeagueModule> = new ConfigurationArray<LeagueModule>('module', LeagueModule);
    dms: ConfigurationArray<DungeonMaster> = new ConfigurationArray<DungeonMaster>('dm', DungeonMaster);
}

class DeleteCommands {
    module: ConfigurationDeleteItemCommand<LeagueModule>;
    dm: ConfigurationDeleteItemCommand<DungeonMaster>;

    constructor(definitions: Definitions) {
        this.module = new ConfigurationDeleteItemCommand(definitions.modules);
        this.dm = new ConfigurationDeleteItemCommand(definitions.dms);
    }

    toJSON() {
        return undefined;
    }
}

export class Configuration {
    // static configuration
    option: Options = new Options();
    define: Definitions = new Definitions();
    delete: DeleteCommands = new DeleteCommands(this.define);

    // current session objects initialized from from definitions
    dm: ConfigurationChooser<DungeonMaster> = new ConfigurationChooser(this.define.dms, Der20Dialog, 'dm');
    module: ConfigurationChooser<LeagueModule> = new ConfigurationChooser(this.define.modules, Der20Dialog, 'module');

    // commands
    start: TimerCommand = new TimerCommand(this.module, 'start');
    stop: TimerCommand = new TimerCommand(this.module, 'stop');
    clear: ClearCommand = new ClearCommand([this.dm, this.module]);
    show: ShowCommand = new ShowCommand(this.dm, this.module);
    preview: SendCommand = new SendCommand(this.dm, this.module, this.define.rules, true); 
    send: SendCommand = new SendCommand(this.dm, this.module, this.define.rules, false);

    // aliases for configuration that frequently has to change per session
    checkpoint: ConfigurationAlias = new ConfigurationAlias(this.module, 'current checkpoint');
    session: ConfigurationAlias = new ConfigurationAlias(this.module, 'current session');

    constructor() {
        // delete commands are allowed so that handouts can own an item entirely, via delete and then define
        // REVISIT: how do you assert that this.option is this[Options.pluginOptionsKey] in a sane way?
        this.option.handouts.subtrees.push('delete');
        this.option.handouts.subtrees.push('define');
    }
}
