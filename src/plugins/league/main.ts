import { CommandsFromHandouts, Plugin } from 'der20/library';
import { Configuration } from './configuration';

const plugin = new Plugin('league', Configuration);
plugin.addCommandSource(CommandsFromHandouts, ['define', 'delete']);
plugin.start();