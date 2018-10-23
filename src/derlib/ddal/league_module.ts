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

    hourlyAdvancement(): number {
        if ((this.season.value() < 8) || (this.hardcover.value())) {
            return 1;
        }
        return 0;
    }

    hourlyTreasure(): number {
        let multiplier = 1;
        if ((this.tier.value() > 2) && (!this.hardcover.value())) {
            multiplier = 2;
        }
        return multiplier * this.hourlyAdvancement();
    }

    defaultDuration(): number {
        if (this.hardcover.value()) {
            return 0;
        } else {
            return 4;
        }
    }

    treasureAward(): number {
        // sum all awarded treasure from checkpoints
        let treasure = this.checkpoints.current.map((checkpoint) => {
            if (checkpoint.awarded.value()) {
                return checkpoint.treasure.value();
            } else {
                return 0;
            }
        }).reduce((previous, current) => {
            return previous + current;
        }, 0);

        let hours = this.hoursAward();
        if (hours <= 0.0) {
            // start and stop may not be configured
            return treasure;
        }

        // add any hourly treasure, which should be mutually exclusive with checkpoints
        // but there may be modules in the future that change this
        treasure += this.hourly.treasure.value() * hours;
        return treasure;
    }

    advancementAward(): number {
        // sum all awarded advancement from checkpoints
        let advancement = this.checkpoints.current.map((checkpoint) => {
            if (checkpoint.awarded.value()) {
                return checkpoint.advancement.value();
            } else {
                return 0;
            }
        }).reduce((previous, current) => {
            return previous + current;
        }, 0);

        let hours = this.hoursAward();
        if (hours <= 0.0) {
            // start and stop may not be configured
            return advancement;
        }
   
        // add any hourly advancement, which should be mutually exclusive with checkpoints
        // but there may be modules in the future that change this
        advancement += this.hourly.advancement.value() * hours;
        return advancement;
    }

    hoursAward(): number {
        let hours = (this.stop.value() - this.start.value()) / (60 * 60 * 1000);
        if (Number.isNaN(hours)) {
            return 0;
        }
        if (hours <= 0) {
            return 0;
        }
        if (this.duration.value() <= 0) {
            // no duration limit
            return Math.floor(hours);
        }
        if (hours > this.duration.value()) {
            return Math.floor(this.duration.value());
        }
        return Math.floor(hours);
    }

    constructor() {
        super();
        this.addTrigger('tier', Result.Event.Change, new ConfigurationUpdate.Default(['level', 'minimum'], this.minimumLevelForTier));
        this.addTrigger('tier', Result.Event.Change, new ConfigurationUpdate.Default(['level', 'maximum'], this.maximumLevelForTier));
        this.addTrigger('season', Result.Event.Change, new ConfigurationUpdate.Default(['hourly', 'advancement'], this.hourlyAdvancement));
        this.addTrigger('season', Result.Event.Change, new ConfigurationUpdate.Default(['hourly', 'treasure'], this.hourlyTreasure));
        this.addTrigger('hardcover', Result.Event.Change, new ConfigurationUpdate.Default(['hourly', 'advancement'], this.hourlyAdvancement));
        this.addTrigger('hardcover', Result.Event.Change, new ConfigurationUpdate.Default(['hourly', 'treasure'], this.hourlyTreasure));
        this.addTrigger('hardcover', Result.Event.Change, new ConfigurationUpdate.Default(['duration'], this.defaultDuration));
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