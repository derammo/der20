import { Configuration } from 'plugins/rewards/configuration';
import { HelpCommand } from 'der20/config/help';
import { PluginParserContext } from 'der20/plugin/main';
import { Options } from 'der20/plugin/options';
import { DialogResult } from 'der20/config/result';

export function testDialog() {
    let configuration = new Configuration();
    let help = new HelpCommand('rewards', configuration);
    let result = help.handleEndOfCommand(new PluginParserContext(new Options(), 'help', ''));
    return (<DialogResult>result).dialog;
}

console.log(testDialog());
