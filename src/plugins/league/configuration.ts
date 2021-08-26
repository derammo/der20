import { ClearCommand as ClearCommand, ConfigurationAlias, ConfigurationArray, ConfigurationChangeHandling, ConfigurationChooser, ConfigurationDeleteItemCommand, ConfigurationFromTemplate, ConfigurationIntermediateNode, HandoutsOptions, HandoutsSupport, Options, keyword, ConfigurationPopulateCommand, format, config } from 'der20/library';
import { DungeonMaster } from './ddal/dungeon_master';
import { LeagueModule, LeagueModuleDefinition } from './ddal/league_module';
import { PartyState } from './ddal/party_state';
import { Rules } from './rules';
import { TokenScalingCommand } from './scaling_command';
import { SendCommand } from './send_command';
import { SessionShowCommand } from './session_show';
import { SessionStartCommand } from './session_start';

// add handouts and tokens support to basic options
class RewardsOptions extends Options implements HandoutsSupport {
    @config handouts: HandoutsOptions = new HandoutsOptions();
}

class Definitions extends ConfigurationIntermediateNode {
    @config rules: Rules = new Rules();
    @config modules: ConfigurationArray<LeagueModuleDefinition> = new ConfigurationArray<LeagueModuleDefinition>('module', LeagueModuleDefinition);
    @config dms: ConfigurationArray<DungeonMaster> = new ConfigurationArray<DungeonMaster>('dm', DungeonMaster);
}

class DeleteCommands {
    @config module: ConfigurationDeleteItemCommand<LeagueModule>;
    @config dm: ConfigurationDeleteItemCommand<DungeonMaster>;

    constructor(definitions: Definitions, options: RewardsOptions) {
        this.module = new ConfigurationDeleteItemCommand(definitions.modules);
        this.dm = new ConfigurationDeleteItemCommand(definitions.dms);
    }

    toJSON(): any {
        return undefined;
    }
}

class PopulateCommands {
    @format('ID] unlock [ID')
    @config module: ConfigurationPopulateCommand;

    constructor(definitions: Definitions) {
        this.module = new ConfigurationPopulateCommand(definitions.modules);
    }

    toJSON(): any {
        return undefined;
    }
}

// XXX instead of all of these links, let parser and loader contexts carry the call stack of <any> ancestors, which we need to build anyway for 'show running'
// XXX something with an instanceof check?  are those reliable in our hierarchy?
class SessionConfiguration extends ConfigurationIntermediateNode implements ConfigurationChangeHandling {
    // current session objects initialized from from definitions
    @config dm: ConfigurationChooser<DungeonMaster>;

    @config module: ConfigurationFromTemplate<LeagueModuleDefinition, LeagueModule>;

    // current party composition
    @config party: PartyState;

    // commands
    @config start: SessionStartCommand;
    @config stop: ConfigurationAlias;
    @config clear: ClearCommand;
    @config show: SessionShowCommand;

    constructor(define: Definitions, scaling: TokenScalingCommand) {
        super();
        this.dm = new ConfigurationChooser(define.dms, 'session dm');
        this.module = new ConfigurationFromTemplate(define.modules, 'session module', LeagueModule);
        this.party = new PartyState(this.module, scaling);
        this.start = new SessionStartCommand(this.module, this.party);
        this.stop = new ConfigurationAlias(this.module, 'current stop');
        this.clear = new ClearCommand([this.dm, this.module, this.party], 'cleared current session data and item selection');
        this.show = new SessionShowCommand(this.dm, this.module, this.party);
    }

    handleChange(changedKeyword: string): void {
        switch (changedKeyword) {
            case 'party':
                // may include apl update
                if (this.module.hasConfiguredValue()) {
                    this.module.currentValue.apl = this.party.apl.value();
                    this.module.currentValue.handleChange('apl');
                }
                break;
            case 'module':
                if (this.module.hasConfiguredValue()) {
                    // we don't currently have a good way for transient objects to navigate the configuration, so we
                    // push this value down into each module as it is loaded                    
                    if (this.module.currentValue.apl === undefined) {
                        this.module.currentValue.apl = this.party.apl.value();
                        this.module.currentValue.handleChange('apl');
                    }
                    // if the module is changed, we also need to update the party strength (we really need bubbling events here or an observer interface)
                    this.party.handleChange('apl');
                }
                break;
            default:
            // ignore
        }
    }
}

class RewardsConfiguration extends ConfigurationIntermediateNode {
    @config preview: SendCommand;
    @config send: SendCommand;

    constructor(session: SessionConfiguration, define: Definitions) {
        super();
        this.preview = new SendCommand(session.dm, session.module, define.rules, session.party, true);
        this.send = new SendCommand(session.dm, session.module, define.rules, session.party, false);
    }
}

export class Configuration {
    // static configuration
    @keyword('option')
    @config options: RewardsOptions = new RewardsOptions();
    @config define: Definitions = new Definitions();
    @config delete: DeleteCommands = new DeleteCommands(this.define, this.options);
    @config populate: PopulateCommands = new PopulateCommands(this.define);

    // tokens added/removed based on scaling according to APL
    @config scaling: TokenScalingCommand = new TokenScalingCommand();

    // current game session
    @config session: SessionConfiguration = new SessionConfiguration(this.define, this.scaling);

    // rewards awarded from current session
    @config rewards: RewardsConfiguration = new RewardsConfiguration(this.session, this.define);
}
