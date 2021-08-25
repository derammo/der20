import { Configuration } from 'plugins/league/configuration';
import { HelpCommand } from 'der20/config/help';
import { PluginParserContext } from "der20/plugin/parser_context";
import { Options } from 'der20/plugin/options';
import { DialogResult } from 'der20/config/result';
import { CommandInputImpl } from 'der20/config/input';
import { CommandInput } from 'der20/interfaces/config';

export function testDialog() {
    let configuration = new Configuration();
    let help = new HelpCommand('rewards', configuration);
    let result = help.handleEndOfCommand(new PluginParserContext(new Options(), new CommandInputImpl.Base(CommandInput.Kind.Journal), 'help', ''));
    return (<DialogResult>result).dialog;
}

console.log(testDialog());
