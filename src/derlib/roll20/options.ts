import { RegexValidator, validation } from 'derlib/config/validation';
import { format, common } from 'derlib/config/help';
import { keyword } from 'derlib/config/parser';
import { ConfigurationSet } from 'derlib/config/set';
import { ConfigurationDeleteItemCommand } from 'derlib/config/deleteitem';
import { ConfigurationBoolean } from 'derlib/config/atoms';
import { ConfigurationChangeDelegator } from 'derlib/config/events';
import { ConfigurationIntermediateNode } from 'derlib/config/intermediate';

export class Options extends ConfigurationChangeDelegator {
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

    toJSON(): any {
        return ConfigurationIntermediateNode.collapse(this);
    }
}


class DeleteOptionCommands extends ConfigurationChangeDelegator {
    @format('ID')
    @common('PLUGIN')
    command: ConfigurationDeleteItemCommand<String>;

    constructor(commands: ConfigurationSet) {
        super();
        this.command = new ConfigurationDeleteItemCommand<String>(commands);
    }

    toJSON(): any {
        return undefined;
    }
}
