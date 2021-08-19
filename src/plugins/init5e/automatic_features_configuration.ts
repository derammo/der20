import { ConfigurationBoolean, ConfigurationIntermediateNode, ConfigurationString } from 'der20/library';

export class AutomaticMarkerConfiguration extends ConfigurationIntermediateNode {
    name: ConfigurationString = new ConfigurationString("Round");
    insert: ConfigurationBoolean = new ConfigurationBoolean(false);
}

export class AutomaticFeaturesConfiguration extends ConfigurationIntermediateNode {
    actions: ConfigurationBoolean = new ConfigurationBoolean(false);
    sort: ConfigurationBoolean = new ConfigurationBoolean(false);
    marker: AutomaticMarkerConfiguration = new AutomaticMarkerConfiguration();
}
