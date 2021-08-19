import { ConfigurationIntermediateNode, Plugin, PluginWithOptions, TurnOrderAnnouncer } from 'der20/library';
import { RollCommand } from './roll';
import { ClearCommand } from './clear';
import { SortCommand } from './sort';
import { NewTurnCommand } from './new_turn_command';
import { AutomaticFeaturesConfiguration } from "./automatic_features_configuration";

class ActionsConfiguration extends ConfigurationIntermediateNode {
    constructor(autoFeatures: AutomaticFeaturesConfiguration) {
        super();
        this.announce = new NewTurnCommand(autoFeatures);
    }
    
    announce: NewTurnCommand;
}
class Configuration extends PluginWithOptions {
    roll: RollCommand = new RollCommand();
    clear: ClearCommand = new ClearCommand();
    sort: SortCommand = new SortCommand();
    automatic: AutomaticFeaturesConfiguration = new AutomaticFeaturesConfiguration();
    actions: ActionsConfiguration = new ActionsConfiguration(this.automatic);
}

const plugin = new Plugin('init5e', Configuration);
plugin.addCommandSource(TurnOrderAnnouncer, ["actions"]);
plugin.start();

