debug.log = console.log;

import { Plugin } from 'der20/library';
import { Options } from 'der20/library';

// add handouts support to plugin
import { HandoutsOptions } from 'der20/library';
import { keyword } from 'der20/library';

class HandoutTestOptions extends Options {
    handouts: HandoutsOptions = new HandoutsOptions();
}

class Configuration {
    @keyword('option')
    options: HandoutTestOptions = new HandoutTestOptions();
}

let testObject = new Configuration();
debug.log(JSON.stringify(testObject));

new Plugin('handout_test', Configuration).start();