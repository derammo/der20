import { TimerCommand } from './timer_command'
import { SendCommand } from './send_command';
import { ShowCommand } from './show_command';
import { ConfigurationArray, ConfigurationChooser } from 'der20/library';
import { ConfigurationDeleteItemCommand } from 'der20/library';
import { ClearCommand } from 'der20/library';
import { ConfigurationAlias } from 'der20/library';
import { Rules } from './rules';
import { Options } from 'der20/library';

// add handouts support to plugin by loading optional module
import { HandoutsOptions, HandoutsSupport } from 'der20/library';
import { keyword } from 'der20/library';
import { format } from 'der20/library';
import { ConfigurationIntermediateNode } from 'der20/library';
import { LeagueModule } from './ddal/league_module';
import { DungeonMaster } from './ddal/dungeon_master';

// add handouts support to basic options
// REVISIT: replace this with civilized plugin extension, instead of mixin and this
class RewardsOptions extends Options implements HandoutsSupport {
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
    clear: ClearCommand = new ClearCommand([this.dm, this.module], 'cleared current session data and item selection');
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
