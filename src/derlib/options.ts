import { RegexValidator, validation } from 'derlib/config/validation';
import { format, common } from 'derlib/config/help';
import { keyword } from 'derlib/config/parser';
import { ConfigurationSet } from 'derlib/config/set';
import { ConfigurationDeleteItemCommand } from 'derlib/config/deleteitem';
import { ConfigurationBoolean } from 'derlib/config/atoms';
import { ConfigurationIntermediateNode } from 'derlib/config/intermediate';
import { ConfigurationChangeDelegator } from './config/events';

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

    // enable or disable printing of executed commands
    @common('PLUGIN')
    echo: ConfigurationBoolean = new ConfigurationBoolean(true);
   
    // enable or disable response messages from commands
    @common('PLUGIN')
    verbose: ConfigurationBoolean = new ConfigurationBoolean(false);

    toJSON(): any {
        return ConfigurationIntermediateNode.collapse(this);
    }
}

/**
 * Base class for configuration of a plugin that supports options configuration
 */
export class PluginWithOptions {
    @keyword('option')
    options: Options = new Options();
}

class DeleteOptionCommands {
    @format('ID')
    @common('PLUGIN')
    command: ConfigurationDeleteItemCommand<String>;

    constructor(commands: ConfigurationSet) {
        this.command = new ConfigurationDeleteItemCommand<String>(commands);
    }

    clone(): DeleteOptionCommands {
        // frozen configuration does not implement commands
        return undefined;
    }

    toJSON(): any {
        return undefined;
    }
}
