import { Configuration } from "./configuration";
import { Plugin, CommandsFromHandouts, CommandsFromTokens } from "der20/library";

const plugin = new Plugin('league', Configuration);
plugin.addCommandSource(CommandsFromHandouts, ['define', 'delete']);
plugin.addCommandSource(CommandsFromTokens, ['scaling']);
plugin.start();