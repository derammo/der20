import { ConfigurationChangeHandling, Clearable, ConfigurationString, ConfigurationFloat, ConfigurationValue, keyword, data } from 'der20/library';
import { PlayerCharacters } from './player_characters';
import { LeagueModule } from './league_module';

export interface ScalingChangeObserver {
    handleStrengthChange(strength: string): void;
}

export class PartyState implements ConfigurationChangeHandling, Clearable {
    @data
    private module: ConfigurationValue<LeagueModule>;

    @data
    private scalingChanges: ScalingChangeObserver;

    apl: ConfigurationFloat = new ConfigurationFloat(ConfigurationValue.UNSET);

    strength: ConfigurationString = new ConfigurationString('Average');

    @keyword('pc')
    pcs: PlayerCharacters = new PlayerCharacters();

    constructor(module: ConfigurationValue<LeagueModule>, scalingChanges: ScalingChangeObserver) {
        this.module = module;
        this.scalingChanges = scalingChanges;
    }

    toJSON(): any {
        const apl = this.apl.toJSON();
        const strength = this.strength.toJSON();
        if ((apl === undefined) && (strength === undefined)) {
            return undefined;
        }
        // persist only those things that have overrides we might keep
        return { apl: apl, strength: strength }
    }

    static readonly strengthTable = [
        // 3-4
        ['Very Weak', 'Weak', 'Average'],
        // 5
        ['Weak', 'Average', 'Strong'],
        // 6-7
        ['Average', 'Strong', 'Very Strong']
    ];

    handleChange(changedKeyword: string): void {
        switch (changedKeyword) {
            case 'pc':
                // based on pcs, update apl default
                this.apl.default = this.pcs.averagePartyLevel();
                if (this.apl.hasConfiguredValue()) {
                    break;
                }
            // tslint:disable-next-line:no-switch-case-fall-through
            case 'apl':
                // based on apl, update strength default
                let playerComparison; // 0,1,2 representing <,=,>
                let aplComparison; // 0,1,2 representing <,=,>
                const players = this.pcs.count();
                if ((players < 1) || (!this.module.hasConfiguredValue())) {
                    playerComparison = 1;
                    aplComparison = 1;
                } else {
                    playerComparison = Math.sign(players - 5) + 1;
                    const apl = Math.round(this.apl.value());
                    const aplTarget = this.module.value().target.apl.value();
                    aplComparison = Math.sign(apl - aplTarget) + 1;
                }
                const previousValue = this.strength.value();
                this.strength.default = PartyState.strengthTable[playerComparison][aplComparison];
                if ((this.scalingChanges !== undefined) && (this.strength.value() !== previousValue)) {
                    this.scalingChanges.handleStrengthChange(this.strength.value());
                }
                break;
            case 'strength': 
                // override
                if (this.scalingChanges !== undefined) {
                    this.scalingChanges.handleStrengthChange(this.strength.value());
                }
                break;                
            default:
               // ignore
        }
    }

    clear(): void {
        this.apl.clear();
        this.strength.clear();
        this.pcs.clear();
    }
}
