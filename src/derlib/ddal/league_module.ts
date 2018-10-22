import { ConfigurationString, ConfigurationInteger, ConfigurationBoolean, ConfigurationDate, ConfigurationFloat, ConfigurationStep } from 'derlib/config/atoms';
import { clone } from 'derlib/utility';
import { ConfigurationEventHandler, ConfigurationUpdate } from 'derlib/config/parser';
import { Result } from 'derlib/config/result';
import { ConfigurationIntermediateNode } from 'derlib/config/intermediate';
import { ConfigurationArray } from '../config/array';

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

export class LeagueModule extends ConfigurationEventHandler {
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

    minimumLevelForTier(): number {
        switch (this.tier.value()) {
            case 1:
                return 1;
            case 2:
                return 5;
            case 3:
                return 11;
            case 4:
                return 17;
            default:
                return 1;
        }
    }

    maximumLevelForTier(): number {
        switch (this.tier.value()) {
            case 1:
                return 4;
            case 2:
                return 10;
            case 3:
                return 16;
            case 4:
                return 20;
            default:
                return 20;
        }
    }

    constructor() {
        super();
        this.addTrigger('tier', Result.Event.Change, new ConfigurationUpdate.Default(['level', 'minimum'], this.minimumLevelForTier));
        this.addTrigger('tier', Result.Event.Change, new ConfigurationUpdate.Default(['level', 'maximum'], this.maximumLevelForTier));
    }
}

export namespace LeagueModule {
    export class Level extends ConfigurationIntermediateNode {
        minimum: ConfigurationInteger = new ConfigurationInteger(ConfigurationStep.NO_VALUE);
        maximum: ConfigurationInteger = new ConfigurationInteger(ConfigurationStep.NO_VALUE);

        clone(): Level {
            return clone(LeagueModule.Level, this);
        }
    }
    export class Hourly extends ConfigurationIntermediateNode {
        advancement: ConfigurationFloat = new ConfigurationFloat(ConfigurationStep.NO_VALUE);
        treasure: ConfigurationFloat = new ConfigurationFloat(ConfigurationStep.NO_VALUE);

        clone(): Hourly {
            return clone(LeagueModule.Hourly, this);
        }
    }
}