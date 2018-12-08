import { CommandsFromHandouts, CommandsFromTokens, Plugin } from 'der20/library';
import { Configuration } from './configuration';

const plugin = new Plugin('league', Configuration);
plugin.addCommandSource(CommandsFromHandouts, ['define', 'delete']);

// ref this so the import does not get removed
debug.log(CommandsFromTokens.name);
// NOT READY FOR RELEASE
// plugin.addCommandSource(CommandsFromTokens, ['scaling']);

plugin.start();