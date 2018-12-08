import { Change, Clearable, ConfigurationChangeHandling, ConfigurationFloat, ConfigurationIntermediateNode, ConfigurationSimpleCommand, ConfigurationString, ConfigurationValue, ParserContext, Result, keyword, noconfig } from 'der20/library';
import { LeagueModule } from './league_module';
import { PlayerCharacters } from './player_characters';

export interface ScalingChangeObserver {
    handleStrengthChange(strength: string): void;
}

export class PartyState extends ConfigurationIntermediateNode implements ConfigurationChangeHandling, Clearable {
    @noconfig
    private module: ConfigurationValue<LeagueModule>;

    @noconfig
    private scalingChanges: ScalingChangeObserver;

    apl: ConfigurationFloat = new ConfigurationFloat(ConfigurationValue.UNSET);

    strength: ConfigurationString = new ConfigurationString('Average');

    @keyword('pc')
    pcs: PlayerCharacters = new PlayerCharacters();

    scan: ConfigurationSimpleCommand;

    constructor(module: ConfigurationValue<LeagueModule>, scalingChanges: ScalingChangeObserver) {
        super();
        this.module = module;
        this.scalingChanges = scalingChanges;
        this.scan = new PlayerScan(this);
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
                if (players < 1 || !this.module.hasConfiguredValue()) {
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
                if (this.scalingChanges !== undefined && this.strength.value() !== previousValue) {
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

class PlayerScan extends ConfigurationSimpleCommand {
    constructor(private party: PartyState) {
        super();
        // generated
    }

    handleEndOfCommand(context: ParserContext): Result {
        // reserved word to use to rescan list of currently loaded characters
        this.party.pcs.scan();

        // handle event we should have received from pcs
        this.party.handleChange('pc');        

        // this is a change event to trigger event change listeners above
        return new Change('scanned players currently in session');
    }
}
