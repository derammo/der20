debug.log = console.log;

import { config, HandoutsOptions, keyword, Options, Plugin } from 'der20/library';

class HandoutTestOptions extends Options {
    @config handouts: HandoutsOptions = new HandoutsOptions();
}

class Configuration {
    @keyword('option')
    @config options: HandoutTestOptions = new HandoutTestOptions();
}

let testObject = new Configuration();
debug.log(JSON.stringify(testObject));

new Plugin('handout_test', Configuration).start();