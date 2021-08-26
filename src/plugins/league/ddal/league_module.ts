import { ConfigurationArray, ConfigurationBoolean, ConfigurationChangeHandling, ConfigurationDate, ConfigurationFloat, ConfigurationInteger, ConfigurationIntermediateNode, ConfigurationString, ConfigurationTermination, ConfigurationValue, DialogResult, ParserContext, Result, Success, clone, data, ConfigurationEnumerated, config } from 'der20/library';
import { Objective } from './objective';
import { Unlock, UnlockDefinition } from './unlock';

class TargetConfiguration extends ConfigurationIntermediateNode {
    /**
     * the target APL of the module
     */
     @config apl: ConfigurationInteger = new ConfigurationInteger(1);
}

export class LeagueModuleDefinition implements ConfigurationChangeHandling, ConfigurationTermination {
    // can't be undefined, because we need to detect that we can load it
    id: string = null;

    @config name: ConfigurationString = new ConfigurationString(ConfigurationValue.UNSET);
    @config objectives: ConfigurationArray<Objective> = new ConfigurationArray<Objective>('objective', Objective);
    @config unlocks: ConfigurationArray<UnlockDefinition> = new ConfigurationArray<UnlockDefinition>('unlock', UnlockDefinition);
    @config tier: ConfigurationInteger = new ConfigurationInteger(0);
    @config season: ConfigurationEnumerated = new ConfigurationEnumerated("Historical", [ "Historical", "Masters", "10" ]);
    @config hardcover: ConfigurationBoolean = new ConfigurationBoolean(false);
    @config level: LeagueModule.Level = new LeagueModule.Level();
    @config duration: ConfigurationFloat = new ConfigurationFloat(4);
    @config target: TargetConfiguration = new TargetConfiguration();

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

    defaultDuration(): number {
        if (this.hardcover.value()) {
            return 0;
        } else {
            return 4;
        }
    }

    hasTierRewardsDifference(): boolean {
        return (this.hardcover.value() && (this.level.maximum.value() > 10) && (this.level.minimum.value() < 11));
    }

    handleChange(keyword: string) {
        switch (keyword) {
            case 'tier':
                this.level.minimum.defaultValue = this.minimumLevelForTier();
                this.level.maximum.defaultValue = this.maximumLevelForTier();
            // eslint-disable-next-line no-fallthrough
            case 'level':
                this.target.apl.defaultValue = Math.round((this.level.minimum.value() + this.level.maximum.value()) / 2);
                break;
            case 'season':
                break;
            case 'hardcover':
                this.duration.defaultValue = this.defaultDuration();
                break;
            default:
                // ignore
        }
    }

    handleEndOfCommand(context: ParserContext): Result {
        if (!context.rest.startsWith('define ')) {
            return new Success('no configuration changed');
        }
        let dialog = new context.dialog();
        const link = { 
            command: context.command,
            prefix: context.rest,
            followUps: [ context.rest ]
        };
        dialog.addTitle(`Definition for Module '${this.id}'`);
        dialog.beginControlGroup();
        dialog.addEditControl('Module Name', 'name', this.name, link);
        dialog.addEditControl('Season', 'season', this.season, link);
        dialog.addEditControl('Hardcover', 'hardcover', this.hardcover, link);
        dialog.addSeparator();
        dialog.addEditControl('Tier', 'tier', this.tier, link);
        dialog.addEditControl('Minimum Level', 'level minimum', this.level.minimum, link);
        dialog.addEditControl('Maximum Level', 'level maximum', this.level.maximum, link);
        dialog.addEditControl('Target APL', 'target apl', this.target.apl, link);
        dialog.addSeparator();
        // XXX pending DDAL rules
        // dialog.addEditControl('Maximum Duration', 'duration', this.duration, link);
        // dialog.addSeparator();
        dialog.addTableControl('Unlocks', 'unlock', this.unlocks.value(), link);

        if ((this.objectives.value().length > 0) || (!this.hardcover.value())) {
            dialog.addSeparator();
            dialog.addTableControl('Story Awards', 'objective', this.objectives.value(), link);
        }

        dialog.endControlGroup();
        return new DialogResult(DialogResult.Destination.Caller, dialog.render());
    }
}

type UniqueUnlock = { item: UnlockDefinition, count: number};

export class LeagueModule extends LeagueModuleDefinition {
    // this is the actual APL of the party, written here when it is determined elsewhere
    @data
    apl: number;

    // NOTE: this upgrades the type of a property from the base class, which works correctly
    // because ConfigurationArray implements 'cloneFrom(...)' in such a way as to upgrade the items to 'Unlock' on copy
    @config unlocks: ConfigurationArray<Unlock> = new ConfigurationArray<Unlock>('unlock', Unlock);

    @config session: ConfigurationString = new ConfigurationString(ConfigurationValue.UNSET);
    @config start: ConfigurationDate = new ConfigurationDate(ConfigurationValue.UNSET);
    @config stop: ConfigurationDate = new ConfigurationDate(ConfigurationValue.UNSET);
   
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
    
    updateTierFromAPL() {
        if (!this.hardcover.value()) {
            return;
        }
        let tier = 1;
        if (this.apl >= 16.5) {
            tier = 4;
        } else if (this.apl >= 10.5) {
            tier = 3;
        } else if (this.apl >= 4.5) {
            tier = 2;
        }
        this.tier.defaultValue = tier;
    }

    handleChange(keyword: string) {
        switch (keyword) {
            case 'apl':
                this.updateTierFromAPL();
                break;
            default:
                super.handleChange(keyword);
        }
    }

    uniqueUnlocks(): UniqueUnlock[] {
        let uniqueUnlocks: Map<string, UniqueUnlock> = new Map();
        for (let item of this.unlocks.currentValue) {
            if (!item.awarded.value()) {
                continue;
            }
            const key = [item.name.value(), item.description.value(), item.table.value(), item.rarity.value()].join(';');
            if (!uniqueUnlocks.has(key)) {
                uniqueUnlocks.set(key, { item: item, count: 1 });
                continue;
            }
            let entry = uniqueUnlocks.get(key);
            entry.count = entry.count + 1;
        }
        return Array.from(uniqueUnlocks.values());
    }
} 

// eslint-disable-next-line no-redeclare
export namespace LeagueModule {
    export class Level extends ConfigurationIntermediateNode {
        @config minimum: ConfigurationInteger = new ConfigurationInteger(1);
        @config maximum: ConfigurationInteger = new ConfigurationInteger(20);

        clone(): Level {
            return clone(LeagueModule.Level, this);
        }
    }
}