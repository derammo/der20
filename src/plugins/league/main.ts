import { CommandsFromHandouts, CommandsFromTokens, Plugin } from 'der20/library';
import { Configuration } from './configuration';

const plugin = new Plugin('league', Configuration);
plugin.addCommandSource(CommandsFromHandouts, ['define', 'delete']);
plugin.addCommandSource(CommandsFromTokens, ['scaling']);
plugin.start();