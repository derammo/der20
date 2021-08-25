import { ClearCommand, ConfigurationIntermediateNode, data } from 'der20/library';
import { PositionData } from './data';
import { RestoreCommand } from './restore';
import { SaveCommand } from './save';

/**
 * the positions of tokens
 */
export class PositionsConfiguration extends ConfigurationIntermediateNode {
    @data
    data: PositionData = new PositionData();

    clear: ClearCommand = new ClearCommand([this.data], 'cleared stored positions');

    save: SaveCommand = new SaveCommand(this.data);

    restore: RestoreCommand = new RestoreCommand(this.data);
}
