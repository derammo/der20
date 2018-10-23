import { HandoutsOptions } from "./handouts";

export class Options {
    // plugin options are stored under this key in the configuration root
    static readonly pluginOptionsKey: string = 'option';

    // read handouts GM notes for configuration?
    handouts: HandoutsOptions = new HandoutsOptions(Options.pluginOptionsKey);
}
