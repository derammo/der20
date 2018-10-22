import { ConfigurationString, ConfigurationStep } from 'derlib/config/atoms';

export class DungeonMaster {
    // can't be undefined, because we need to detect that we can configurat it
    id: string = null;
    
    name: ConfigurationString = new ConfigurationString(ConfigurationStep.NO_VALUE);
    dci: ConfigurationString = new ConfigurationString(ConfigurationStep.NO_VALUE);
}
