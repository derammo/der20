import { config, ConfigurationAlias, ConfigurationIntermediateNode, ephemeral, PluginWithOptions } from 'der20/library';
import { CharacterConfiguration } from './character';
import { PositionData } from './data';
import { PositionsConfiguration } from './positions';
import { RestoreAllCommand } from './restore_all';
import { TokensConfiguration } from './tokens';


/**
 * game session, such as preparing and resetting the map
 */
class SessionConfiguration extends ConfigurationIntermediateNode {
    @config restore: RestoreAllCommand;

    constructor(positionData: PositionData) {
        super();
        this.restore = new RestoreAllCommand(positionData);
    }
}

export class Configuration extends PluginWithOptions {
    @config tokens: TokensConfiguration = new TokensConfiguration();
    @config token: ConfigurationAlias = new ConfigurationAlias(this, 'tokens');
    @config positions: PositionsConfiguration = new PositionsConfiguration();
    @config session: SessionConfiguration = new SessionConfiguration(this.positions.data); 
    @ephemeral
    character: CharacterConfiguration = new CharacterConfiguration();
}
