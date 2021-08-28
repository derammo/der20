import { common, format } from 'der20/config/help';
import { ConfigurationBoolean } from 'der20/config/atoms';
import { ConfigurationChangeDelegator } from 'der20/config/change_delegator';
import { ConfigurationDeleteItemCommand } from 'der20/config/deleteitem';
import { ConfigurationIntermediateNode } from 'der20/config/intermediate';
import { ConfigurationSet } from 'der20/config/set';
import { config, keyword } from "der20/config/decorators";
import { RegexValidator, validation } from 'der20/config/validation';

export class Options extends ConfigurationChangeDelegator {
    // this object contains plugin options and is stored under this key in the configuration root
    static readonly pluginOptionsKey: string = 'options';

    // additional commands to be recognized
    @format('ID')
    @validation(new RegexValidator(/^[a-z0-9_]+$/, 'commands must consist entirely of a-z, 0-9, and the underscore character'))
    @keyword('command')
    @common('PLUGIN')
    @config commands: ConfigurationSet = new ConfigurationSet();

    // delete additional command
    @config delete: DeleteOptionCommands = new DeleteOptionCommands(this.commands);

    // enable or disable debug output
    @common('PLUGIN')
    @config debug: ConfigurationBoolean = new ConfigurationBoolean(false);

    // enable or disable printing of executed commands
    @common('PLUGIN')
    @config echo: ConfigurationBoolean = new ConfigurationBoolean(true);
   
    // enable or disable response messages from commands
    @common('PLUGIN')
    @config verbose: ConfigurationBoolean = new ConfigurationBoolean(false);

    toJSON(): any {
        return ConfigurationIntermediateNode.collapse(this);
    }
}

/**
 * Base class for configuration of a plugin that supports options configuration
 */
export class PluginWithOptions {
    @keyword('option')
    @config options: Options = new Options();
}

class DeleteOptionCommands {
    @format('ID')
    @common('PLUGIN')
    @config command: ConfigurationDeleteItemCommand<String>;

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
