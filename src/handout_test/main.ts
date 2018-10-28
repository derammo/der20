import { start } from 'derlib/roll20/plugin';
import { Options } from 'derlib/roll20/options';

// add handouts support to plugin
import { HandoutsOptions } from 'derlib/roll20/handouts';

class PluginOptions {
    handouts: HandoutsOptions = new HandoutsOptions(Options.pluginOptionsKey);
}

class Configuration {
    option: PluginOptions = new PluginOptions();
}

let testObject = new Configuration();
console.log(JSON.stringify(testObject));

start('handout_test', Configuration);