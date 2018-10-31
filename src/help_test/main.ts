import { Configuration } from 'rewards/configuration';
import { HelpCommand } from 'derlib/config/help';
import { PluginParserContext } from 'derlib/roll20/plugin';
import { Result } from 'derlib/config/result';

export function testDialog() {
    let configuration = new Configuration();
    let help = new HelpCommand(configuration);
    let result = help.parse('', new PluginParserContext('help', ''));
    return (<Result.Dialog>result).dialog.replace(/DER20_MAGIC_PLUGIN_STRING/g, 'rewards');
}

console.log(testDialog());
