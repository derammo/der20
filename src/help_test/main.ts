import { Configuration } from 'rewards/configuration';
import { HelpCommand } from 'derlib/config/help';
import { PluginParserContext } from 'derlib/roll20/plugin';
import { Result } from 'derlib/config/result';

export function testDialog() {
    let configuration = new Configuration();
    let help = new HelpCommand('rewards', configuration);
    let result = help.handleEndOfCommand(new PluginParserContext('help', ''));
    return (<Result.Dialog>result).dialog;
}

console.log(testDialog());
