import { config, ConfigurationIntermediateNode, Plugin, PluginWithOptions, TurnOrderAnnouncer } from 'der20/library';
import { RollCommand } from './roll';
import { ClearCommand } from './clear';
import { SortCommand } from './sort';
import { NewTurnCommand } from './new_turn_command';
import { AutomaticFeaturesConfiguration } from "./automatic_features_configuration";
import { BeamCommand } from './beam';

class ActionsConfiguration extends ConfigurationIntermediateNode {
    constructor(autoFeatures: AutomaticFeaturesConfiguration) {
        super();
        this.announce = new NewTurnCommand(autoFeatures);
    }
    
    @config announce: NewTurnCommand;
}

class Configuration extends PluginWithOptions {
    @config automatic: AutomaticFeaturesConfiguration = new AutomaticFeaturesConfiguration();

    @config clear: ClearCommand = new ClearCommand();

    @config sort: SortCommand = new SortCommand();

    @config roll: RollCommand = new RollCommand(this.automatic);

    @config actions: ActionsConfiguration = new ActionsConfiguration(this.automatic);

    @config beam: BeamCommand = new BeamCommand(this.actions.announce);
}


const plugin = new Plugin('init5e', Configuration);
plugin.addCommandSource(TurnOrderAnnouncer, ["actions"]);
plugin.start();

