import { ClearCommand, ConfigurationIntermediateNode, data, config } from 'der20/library';
import { PositionData } from './data';
import { RestoreCommand } from './restore';
import { SaveCommand } from './save';

/**
 * the positions of tokens
 */
export class PositionsConfiguration extends ConfigurationIntermediateNode {
    @data
    data: PositionData = new PositionData();

    @config clear: ClearCommand = new ClearCommand([this.data], 'cleared stored positions');
    @config save: SaveCommand = new SaveCommand(this.data);
    @config restore: RestoreCommand = new RestoreCommand(this.data);
}
