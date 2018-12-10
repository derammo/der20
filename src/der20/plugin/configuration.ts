import { ConfigurationSimpleCommand, ConfigurationCommand } from "der20/config/atoms";
import { Options } from "./options";

// commands we add to the configuration or recognize if provided
export interface BuiltinConfiguration {
    dump: ConfigurationSimpleCommand;
    reset: ConfigurationCommand;
    help: ConfigurationSimpleCommand;
    export: ConfigurationCommand;

    // optional, used if specific plugin supplies it
    options?: Options;
}
