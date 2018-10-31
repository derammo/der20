import { RegexValidator, validation } from 'derlib/config/validation';
import { format, common } from 'derlib/config/help';
import { keyword, ConfigurationEventHandler } from 'derlib/config/parser';
import { ConfigurationSet } from 'derlib/config/set';
import { ConfigurationIntermediateNode } from 'derlib/config/intermediate';
import { ConfigurationDeleteItemCommand } from 'derlib/config/deleteitem';

export class Options extends ConfigurationEventHandler {
    // this object contains plugin options and is stored under this key in the configuration root
    static readonly pluginOptionsKey: string = 'options';

    @format('ID')
    @validation(new RegexValidator(/[a-z0-9_]+/, 'commands must consist entirely of a-z, 0-9, and the underscore character'))
    @keyword('command')
    @common('PLUGIN')
    commands: ConfigurationSet = new ConfigurationSet();

    delete: DeleteOptionCommands = new DeleteOptionCommands(this.commands);

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
