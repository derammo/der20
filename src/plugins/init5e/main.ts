import { Plugin, PluginWithOptions } from 'der20/library';
import { RollCommand } from './roll';
import { ClearCommand } from './clear';
import { SortCommand } from './sort';

class Configuration extends PluginWithOptions {
    roll: RollCommand = new RollCommand();
    clear: ClearCommand = new ClearCommand();
    sort: SortCommand = new SortCommand();
}

new Plugin('init5e', Configuration).start();