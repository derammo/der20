import { ConfigurationState } from "derlib/roll20/state";
import { ConfigurationPersistence } from "derlib/config/persistence";
import { ConfigurationFile } from "derlib/config/file";
import { ConfigurationTemp } from "derlib/config/ephemeral";

export function startPersistence(name: string): ConfigurationPersistence {
    if (ConfigurationState.supported()) {
        return new ConfigurationState(name);
    }
    if (ConfigurationFile.supported()) {
        return new ConfigurationFile(name);
    }
    return new ConfigurationTemp();
}