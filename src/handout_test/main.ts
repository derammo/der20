import { start } from 'derlib/roll20/plugin';
import { Options } from 'derlib/roll20/options';

class Configuration {
    config: Options = new Options();
}

start('handout_test', new Configuration());