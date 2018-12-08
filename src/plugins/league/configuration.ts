import { ClearCommand, ConfigurationAlias, ConfigurationArray, ConfigurationChangeHandling, ConfigurationChooser, ConfigurationDeleteItemCommand, ConfigurationFromTemplate, ConfigurationIntermediateNode, HandoutsOptions, HandoutsSupport, Options, keyword, ConfigurationValue, Result, ParserContext } from 'der20/library';
import { DungeonMaster } from './ddal/dungeon_master';
import { LeagueModule, LeagueModuleDefinition } from './ddal/league_module';
import { PartyState } from './ddal/party_state';
import { Rules } from './rules';
import { TokenScalingCommand } from './scaling_command';
import { SendCommand } from './send_command';
import { ShowCommand } from './show_command';

// add handouts and tokens support to basic options
class RewardsOptions extends Options implements HandoutsSupport {
    handouts: HandoutsOptions = new HandoutsOptions();
}

class Definitions extends ConfigurationIntermediateNode {
    rules: Rules = new Rules();
    modules: ConfigurationArray<LeagueModuleDefinition> = new ConfigurationArray<LeagueModuleDefinition>('module', LeagueModuleDefinition);
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

class StartCommand extends ConfigurationAlias {
    constructor(target: ConfigurationValue<LeagueModule>, private party: PartyState) {
        super(target, 'current start');
        // generated code
    }

    parse(line:string, context: ParserContext): Result {
        const result = super.parse(line, context);
        if (result.isSuccess()) {
            // do a scan now and update from it
            this.party.pcs.scan();
            this.party.handleChange('pc');        
        }
        return result;
    }
}

// XXX instead of all of these links, let parser and loader contexts carry the call stack of <any> ancestors, which we need to build anyway for 'show running'
// XXX something with an instanceof check?  are those reliable in our hierarchy?
class SessionConfiguration extends ConfigurationIntermediateNode implements ConfigurationChangeHandling {
    // current session objects initialized from from definitions
    dm: ConfigurationChooser<DungeonMaster>;
    module: ConfigurationFromTemplate<LeagueModuleDefinition, LeagueModule>;

    // current party composition
    party: PartyState;

    // commands
    start: StartCommand;
    stop: ConfigurationAlias;
    clear: ClearCommand;
    show: ShowCommand;

    constructor(define: Definitions, scaling: TokenScalingCommand) {
        super();
        this.dm = new ConfigurationChooser(define.dms, 'session dm');
        this.module = new ConfigurationFromTemplate(define.modules, 'session module', LeagueModule);
        this.party = new PartyState(this.module, scaling);
        this.start = new StartCommand(this.module, this.party);
        this.stop = new ConfigurationAlias(this.module, 'current stop');
        this.clear = new ClearCommand([this.dm, this.module, this.party], 'cleared current session data and item selection');
        this.show = new ShowCommand(this.dm, this.module, this.party);
    }

    handleChange(changedKeyword: string): void {
        switch (changedKeyword) {
            case 'party':
                // may include apl update
                if (this.module.hasConfiguredValue()) {
                    this.module.current.apl = this.party.apl.value();
                    this.module.current.handleChange('apl');
                }
                break;
            case 'module':
                if (this.module.hasConfiguredValue()) {
                    // we don't currently have a good way for transient objects to navigate the configuration, so we
                    // push this value down into each module as it is loaded                    
                    if (this.module.current.apl === undefined) {
                        this.module.current.apl = this.party.apl.value();
                        this.module.current.handleChange('apl');
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
    preview: SendCommand;
    send: SendCommand;

    constructor(session: SessionConfiguration, define: Definitions) {
        super();
        this.preview = new SendCommand(session.dm, session.module, define.rules, session.party, true);
        this.send = new SendCommand(session.dm, session.module, define.rules, session.party, false);
    }
}

export class Configuration {
    // static configuration
    @keyword('option')
    options: RewardsOptions = new RewardsOptions();
    define: Definitions = new Definitions();
    delete: DeleteCommands = new DeleteCommands(this.define, this.options);

    // tokens added/removed based on scaling according to APL
    // NOT READY FOR RELEASE
    // scaling: TokenScalingCommand = new TokenScalingCommand();

    // current game session
    // NOT READY FOR RELEASE
    // session: SessionConfiguration = new SessionConfiguration(this.define, this.scaling);
    session: SessionConfiguration = new SessionConfiguration(this.define, undefined);

    // rewards awarded from current session
    rewards: RewardsConfiguration = new RewardsConfiguration(this.session, this.define);
}
