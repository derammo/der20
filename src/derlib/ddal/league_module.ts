import { ConfigurationString, ConfigurationInteger, ConfigurationBoolean, ConfigurationArray } from 'derlib/config';

export class CheckPoint {
    id: string = null;
    name: ConfigurationString = new ConfigurationString();
    value: ConfigurationInteger = new ConfigurationInteger();
    awarded: ConfigurationBoolean = new ConfigurationBoolean();
}

export class LeagueModule {
    id: string = null;
    name: ConfigurationString = new ConfigurationString();
    checkpoints: ConfigurationArray<CheckPoint> = new ConfigurationArray<CheckPoint>("checkpoint", CheckPoint);
}
