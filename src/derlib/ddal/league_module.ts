import { ConfigurationString, ConfigurationInteger, ConfigurationBoolean, ConfigurationArray, ConfigurationDate, ConfigurationFloat, ConfigurationStep, ConfigurationParser } from 'derlib/config';
import { cloneExcept, clone } from '../utility';

export class CheckPoint {
    // can't be undefined, because we need to detect that we can configurat it
    id: string = null;

    name: ConfigurationString = new ConfigurationString(ConfigurationStep.NO_VALUE);
    advancement: ConfigurationInteger = new ConfigurationInteger(1);
    treasure: ConfigurationInteger = new ConfigurationInteger(1);
    dm: ConfigurationBoolean = new ConfigurationBoolean(true);
    players: ConfigurationBoolean = new ConfigurationBoolean(true);
    awarded: ConfigurationBoolean = new ConfigurationBoolean(false);
}

export class Unlock {
    // can't be undefined, because we need to detect that we can configurat it
    id: string = null;

    // name of item
    name: ConfigurationString = new ConfigurationString(ConfigurationStep.NO_VALUE);

    // item description including flavor text
    description: ConfigurationString = new ConfigurationString(ConfigurationStep.NO_VALUE);

    // item is considered to be from this table for trading purposes
    table: ConfigurationString = new ConfigurationString(ConfigurationStep.NO_VALUE);

    // unlock awarded to players?
    players: ConfigurationBoolean = new ConfigurationBoolean(true);

    // unlock awarded to dm?
    dm: ConfigurationBoolean = new ConfigurationBoolean(false);
}

// XXX unused
class ConfigurationChangeHandler<T> {
    constructor(source: ConfigurationStep<T>, handler: (changed: ConfigurationStep<T>) => void) {
    }
}

export class LeagueModule {
    // can't be undefined, because we need to detect that we can configurat it
    id: string = null;

    name: ConfigurationString = new ConfigurationString(ConfigurationStep.NO_VALUE);
    checkpoints: ConfigurationArray<CheckPoint> = new ConfigurationArray<CheckPoint>('checkpoint', CheckPoint);
    unlocks: ConfigurationArray<Unlock> = new ConfigurationArray<Unlock>('unlock', Unlock);
    tier: ConfigurationInteger = new ConfigurationInteger(1);
    season: ConfigurationInteger = new ConfigurationInteger(ConfigurationStep.NO_VALUE);
    hardcover: ConfigurationBoolean = new ConfigurationBoolean(false);
    level: LeagueModule.Level = new LeagueModule.Level();
    duration: ConfigurationFloat = new ConfigurationFloat(4);
    hourly: LeagueModule.Hourly = new LeagueModule.Hourly();
    
    session: ConfigurationString = new ConfigurationString(ConfigurationStep.NO_VALUE);
    start: ConfigurationDate = new ConfigurationDate(ConfigurationStep.NO_VALUE);
    stop: ConfigurationDate = new ConfigurationDate(ConfigurationStep.NO_VALUE);

    minimumLevel(): number {
        if (this.level.minimum.hasValue()) {
            return this.level.minimum.current;
        }
        if (this.tier.hasValue()) {
            switch (this.tier.current) {
                case 1:
                    return 1;
                case 2:
                    return 5;
                case 3:
                    return 11;
                case 4:
                    return 17;
            }
        }
        return ConfigurationStep.NO_VALUE;
    }
    constructor() {
    }
}

export namespace LeagueModule {
    export class Level {
        minimum: ConfigurationInteger = new ConfigurationInteger(ConfigurationStep.NO_VALUE);
        maximum: ConfigurationInteger = new ConfigurationInteger(ConfigurationStep.NO_VALUE);

        clone(): Level {
            return clone(LeagueModule.Level, this);
        }
    }
    export class Hourly {
        advancement: ConfigurationFloat = new ConfigurationFloat(ConfigurationStep.NO_VALUE);
        treasure: ConfigurationFloat = new ConfigurationFloat(ConfigurationStep.NO_VALUE);

        clone(): Hourly {
            return clone(LeagueModule.Hourly, this);
        }
    }
}