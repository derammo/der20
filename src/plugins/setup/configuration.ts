import { data, ConfigurationAlias } from 'der20/library';
import { PluginWithOptions } from 'der20/library';
import { ConfigurationIntermediateNode } from 'der20/library';
import { StatCommand } from './stat';
import { SaveCommand } from './save';
import { RestoreCommand } from './restore';
import { TokenResetCommand } from './reset';
import { LightCommand as LightCommand } from './light';
import { DarkvisionCommand } from './darkvision';
import { ClearCommand } from 'der20/library';
import { PositionData } from './data';
import { SessionRestoreCommand } from './session_restore';
import { DeadCommand } from './dead';

/**
 * token settings
 */
class TokenConfiguration extends ConfigurationIntermediateNode {
    stat: StatCommand = new StatCommand();
    reset: TokenResetCommand = new TokenResetCommand();
    light: LightCommand = new LightCommand();
    darkvision: DarkvisionCommand = new DarkvisionCommand();
    dead: DeadCommand = new DeadCommand();
}

/**
 * the positions of tokens
 */
class PositionsConfiguration {
    @data
    data: PositionData = new PositionData();

    clear: ClearCommand = new ClearCommand([this.data], 'cleared stored positions');
    
    save: SaveCommand = new SaveCommand(this.data);
    
    restore: RestoreCommand = new RestoreCommand(this.data);
}

/**
 * game session, such as preparing and resetting the map
 */
class SessionConfiguration extends ConfigurationIntermediateNode {
    restore: SessionRestoreCommand;

    constructor(positionData: PositionData) {
        super();
        this.restore = new SessionRestoreCommand(positionData);
    }
}

export class Configuration extends PluginWithOptions {
    tokens: TokenConfiguration = new TokenConfiguration();
    token: ConfigurationAlias = new ConfigurationAlias(this, 'tokens');
    positions: PositionsConfiguration = new PositionsConfiguration();
    session: SessionConfiguration = new SessionConfiguration(this.positions.data); 
}
