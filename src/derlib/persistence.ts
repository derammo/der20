import { ConfigurationTemp, ConfigurationFile, ConfigurationPersistence } from "./config";
import { ConfigurationState } from "./roll20/state";

export function startPersistence(name: string): ConfigurationPersistence {
    if (ConfigurationState.supported()) {
        return new ConfigurationState(name);
    }
    if (ConfigurationFile.supported()) {
        return new ConfigurationFile(name);
    }
    return new ConfigurationTemp();
}