import { ConfigurationBoolean, ConfigurationIntermediateNode } from "der20/library";

export class WhisperConfiguration extends ConfigurationIntermediateNode {
    set: ConfigurationBoolean = new ConfigurationBoolean(true);
    unset: ConfigurationBoolean = new ConfigurationBoolean(true);
}