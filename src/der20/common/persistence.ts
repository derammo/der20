import { ConfigurationState } from "der20/roll20/state";
import { ConfigurationPersistence } from "der20/config/persistence";
import { ConfigurationFile } from "der20/config/file";
import { ConfigurationTemp } from "der20/config/ephemeral";

export function startPersistence(name: string): ConfigurationPersistence {
    if (ConfigurationState.supported()) {
        return new ConfigurationState(name);
    }
    if (ConfigurationFile.supported()) {
        return new ConfigurationFile(name);
    }
    return new ConfigurationTemp();
}