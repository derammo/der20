import { RegexValidator, validation } from 'derlib/config/validation';
import { format, common } from 'derlib/config/help';
import { keyword, ConfigurationEventHandler } from 'derlib/config/parser';
import { ConfigurationSet } from 'derlib/config/set';
import { ConfigurationIntermediateNode } from 'derlib/config/intermediate';
import { ConfigurationDeleteItemCommand } from 'derlib/config/deleteitem';
import { ConfigurationBoolean } from 'derlib/config/atoms';

export class Options extends ConfigurationEventHandler {
    // this object contains plugin options and is stored under this key in the configuration root
    static readonly pluginOptionsKey: string = 'options';

    // additional commands to be recognized
    @format('ID')
    @validation(new RegexValidator(/^[a-z0-9_]+$/, 'commands must consist entirely of a-z, 0-9, and the underscore character'))
    @keyword('command')
    @common('PLUGIN')
    commands: ConfigurationSet = new ConfigurationSet();

    // delete additional command
    delete: DeleteOptionCommands = new DeleteOptionCommands(this.commands);

    // enable or disable debug output
    @common('PLUGIN')
    debug: ConfigurationBoolean = new ConfigurationBoolean(false);

    // enable or disable response messages from commands
    @common('PLUGIN')
    verbose: ConfigurationBoolean = new ConfigurationBoolean(false);
    
    // mixins will add additional fields here once we get initialization working
    // [key: string]: any;
}


class DeleteOptionCommands extends ConfigurationIntermediateNode {
    @format('ID')
    @common('PLUGIN')
    command: ConfigurationDeleteItemCommand<String>;

    constructor(commands: ConfigurationSet) {
        super();
        this.command = new ConfigurationDeleteItemCommand<String>(commands);
    }
}
