import { Options } from "der20/plugin/options";
import { ConfigurationSimpleCommand, ConfigurationCommand } from "der20/config/atoms";

// commands we add to the configuration or recognize if provided
export interface BuiltinConfiguration {
    dump: ConfigurationSimpleCommand;
    reset: ConfigurationCommand;
    help: ConfigurationSimpleCommand;

    // optional, used if specific plugin supplies it
    show?: ConfigurationSimpleCommand;
    options?: Options;
}
