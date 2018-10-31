debug.log = console.log;

import { start } from 'derlib/roll20/plugin';
import { Options } from 'derlib/roll20/options';

// add handouts support to plugin
import { HandoutsOptions } from 'derlib/roll20/handouts';
import { keyword } from 'derlib/config/parser';

class HandoutTestOptions extends Options {
    handouts: HandoutsOptions = new HandoutsOptions(Options.pluginOptionsKey);
}

class Configuration {
    @keyword('option')
    options: HandoutTestOptions = new HandoutTestOptions();
}

let testObject = new Configuration();
debug.log(JSON.stringify(testObject));

start('handout_test', Configuration);