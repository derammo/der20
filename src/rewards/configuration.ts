import { DungeonMaster } from 'derlib/ddal/dungeon_master';
import { LeagueModule } from 'derlib/ddal/league_module';
import { TimerCommand } from './timer_command';
import { ClearCommand } from './clear_command';
import { SendCommand } from './send_command';
import { ShowCommand } from './show_command';
import { ConfigurationArray, ConfigurationChooser } from 'derlib/config/array';
import { ConfigurationDeleteItemCommand } from 'derlib/config/deleteitem';
import { ConfigurationAlias } from 'derlib/config/alias';
import { Rules } from './rules';
import { Options } from 'derlib/roll20/options';

// add handouts support to plugin by loading optional module
import { HandoutsOptions } from 'derlib/roll20/handouts';
import { keyword } from 'derlib/config/parser';
import { format } from 'derlib/config/help';
import { ConfigurationIntermediateNode } from 'derlib/config/intermediate';

class RewardsOptions extends Options {
    handouts: HandoutsOptions = new HandoutsOptions();
}

class Definitions extends ConfigurationIntermediateNode {
    rules: Rules = new Rules();
    modules: ConfigurationArray<LeagueModule> = new ConfigurationArray<LeagueModule>('module', LeagueModule);
    dms: ConfigurationArray<DungeonMaster> = new ConfigurationArray<DungeonMaster>('dm', DungeonMaster);
}

class DeleteCommands {
    module: ConfigurationDeleteItemCommand<LeagueModule>;
    dm: ConfigurationDeleteItemCommand<DungeonMaster>;

    constructor(definitions: Definitions, options: RewardsOptions) {
        this.module = new ConfigurationDeleteItemCommand(definitions.modules);
        this.dm = new ConfigurationDeleteItemCommand(definitions.dms);
    }

    toJSON(): any {
        return undefined;
    }
}

export class Configuration {
    // static configuration
    @keyword('option')
    options: RewardsOptions = new RewardsOptions();
    define: Definitions = new Definitions();
    delete: DeleteCommands = new DeleteCommands(this.define, this.options);

    // current session objects initialized from from definitions
    dm: ConfigurationChooser<DungeonMaster> = new ConfigurationChooser(this.define.dms, 'dm');
    module: ConfigurationChooser<LeagueModule> = new ConfigurationChooser(this.define.modules, 'module');

    // commands
    start: TimerCommand = new TimerCommand(this.module, 'start');
    stop: TimerCommand = new TimerCommand(this.module, 'stop');
    clear: ClearCommand = new ClearCommand([this.dm, this.module]);
    show: ShowCommand = new ShowCommand(this.dm, this.module);
    preview: SendCommand = new SendCommand(this.dm, this.module, this.define.rules, true); 
    send: SendCommand = new SendCommand(this.dm, this.module, this.define.rules, false);

    // aliases for configuration that frequently has to change per session
    @format('-> module current checkpoint')
    checkpoint: ConfigurationAlias = new ConfigurationAlias(this.module, 'current checkpoint');
    @format('-> module current session')
    session: ConfigurationAlias = new ConfigurationAlias(this.module, 'current session');

    constructor() {
        // delete commands are allowed so that handouts can own an item entirely, via delete and then define
        // REVISIT: how do you assert that this.option is this[Options.pluginOptionsKey] in a sane way?
        this.options.handouts.subtrees.push('delete');
        this.options.handouts.subtrees.push('define');
    }
}
