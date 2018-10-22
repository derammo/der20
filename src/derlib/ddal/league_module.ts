import { ConfigurationString, ConfigurationInteger, ConfigurationBoolean, ConfigurationArray, ConfigurationDate, ConfigurationFloat, ConfigurationStep, ConfigurationParser } from 'derlib/config';
import { clone } from '../utility';
import { ConfigurationEventHandler, ConfigurationUpdate, ConfigurationIntermediateNode } from '../config';
import { Result } from '../config';

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

    minimumLevelForTier(source: ConfigurationStep<number>): number {
        return 0;
    }

    constructor() {
        super();
        this.addTrigger('tier', Result.Event.Change, new ConfigurationUpdate.Default(['level', 'minimum'], this.minimumLevelForTier));
    }

    toJSON() {
        let result = {};
        Object.assign(result, this);
        delete result['handlers'];
        return result;
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