import { ConfigurationBoolean, ConfigurationIntermediateNode, ConfigurationString } from 'der20/library';

export class AutomaticMarkerConfiguration extends ConfigurationIntermediateNode {
    name: ConfigurationString = new ConfigurationString("Round");
    insert: ConfigurationBoolean = new ConfigurationBoolean(true);
}

export class AutomaticFeaturesConfiguration extends ConfigurationIntermediateNode {
    actions: ConfigurationBoolean = new ConfigurationBoolean(true);
    sort: ConfigurationBoolean = new ConfigurationBoolean(true);
    marker: AutomaticMarkerConfiguration = new AutomaticMarkerConfiguration();
}
