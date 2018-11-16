import { Plugin } from 'der20/library';
import { Configuration } from './configuration';

let plugin = new Plugin('setup', Configuration);
plugin.start();

// put on(...) handlers here and call plugin.swapIn() at top of handlers