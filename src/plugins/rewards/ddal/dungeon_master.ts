import { ConfigurationString, ConfigurationValue } from "der20/library";

export class DungeonMaster {
    // can't be undefined, because we need to detect that we can load it
    id: string = null;
    
    name: ConfigurationString = new ConfigurationString(ConfigurationValue.UNSET);
    dci: ConfigurationString = new ConfigurationString(ConfigurationValue.UNSET);
}
