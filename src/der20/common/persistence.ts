import { ConfigurationState } from "der20/roll20/state";
import { ConfigurationPersistence } from "der20/config/persistence";
import { ConfigurationFile } from "der20/config/file";
import { ConfigurationTemp } from "der20/config/ephemeral";

export function startPersistence(name: string): ConfigurationPersistence {
    debug.log(`starting persistence for ${name}`);
    if (ConfigurationState.supported()) {
        debug.log(`starting roll20 state persistence for ${name}`);
        return new ConfigurationState(name);
    }
    if (ConfigurationFile.supported()) {
        debug.log(`starting file persistence for ${name}`);
        return new ConfigurationFile(name);
    }
    debug.log(`falling back to in memory storage for ${name}`);
    return new ConfigurationTemp();
}