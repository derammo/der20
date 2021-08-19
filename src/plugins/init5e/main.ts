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
    automatic: AutomaticFeaturesConfiguration = new AutomaticFeaturesConfiguration();
    clear: ClearCommand = new ClearCommand();
    sort: SortCommand = new SortCommand();
    roll: RollCommand = new RollCommand(this.automatic);
    actions: ActionsConfiguration = new ActionsConfiguration(this.automatic);

    // XXX up and down commands to move each selected token within the initiative, only moving past items with the same pr
}

const plugin = new Plugin('init5e', Configuration);
plugin.addCommandSource(TurnOrderAnnouncer, ["actions"]);
plugin.start();

