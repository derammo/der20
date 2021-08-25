import { ConfigurationAlias, ConfigurationIntermediateNode, ephemeral, PluginWithOptions } from 'der20/library';
import { CharacterConfiguration } from './character';
import { PositionData } from './data';
import { PositionsConfiguration } from './positions';
import { RestoreAllCommand } from './restore_all';
import { TokensConfiguration } from './tokens';


/**
 * game session, such as preparing and resetting the map
 */
class SessionConfiguration extends ConfigurationIntermediateNode {
    restore: RestoreAllCommand;

    constructor(positionData: PositionData) {
        super();
        this.restore = new RestoreAllCommand(positionData);
    }
}

export class Configuration extends PluginWithOptions {
    tokens: TokensConfiguration = new TokensConfiguration();
    token: ConfigurationAlias = new ConfigurationAlias(this, 'tokens');
    positions: PositionsConfiguration = new PositionsConfiguration();
    session: SessionConfiguration = new SessionConfiguration(this.positions.data); 

    @ephemeral
    character: CharacterConfiguration = new CharacterConfiguration();
}
