import { config, ConfigurationBoolean, ConfigurationIntermediateNode, ConfigurationString } from 'der20/library';

export class AutomaticMarkerConfiguration extends ConfigurationIntermediateNode {
    @config name: ConfigurationString = new ConfigurationString("Round");
    
    @config insert: ConfigurationBoolean = new ConfigurationBoolean(true);
}

export class AutomaticFeaturesConfiguration extends ConfigurationIntermediateNode {
    @config actions: ConfigurationBoolean = new ConfigurationBoolean(true);
    
    @config sort: ConfigurationBoolean = new ConfigurationBoolean(true);
    
    @config marker: AutomaticMarkerConfiguration = new AutomaticMarkerConfiguration();

    @config ping: ConfigurationBoolean = new ConfigurationBoolean(true);
}
