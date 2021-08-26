import { ConfigurationBoolean, ConfigurationIntermediateNode, config } from "der20/library";

export class WhisperConfiguration extends ConfigurationIntermediateNode {
    @config set: ConfigurationBoolean = new ConfigurationBoolean(true);
    @config unset: ConfigurationBoolean = new ConfigurationBoolean(true);
}