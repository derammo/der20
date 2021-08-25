import { ConfigurationAlias, ConfigurationValue, Result, ParserContext } from 'der20/library';
import { LeagueModule } from './ddal/league_module';
import { PartyState } from './ddal/party_state';

export class SessionStartCommand extends ConfigurationAlias {
    constructor(target: ConfigurationValue<LeagueModule>, private party: PartyState) {
        super(target, 'current start');
        // generated code
    }

    parse(text: string, context: ParserContext): Result {
        const result = super.parse(text, context);
        if (result.isSuccess()) {
            // do a scan now and update from it
            this.party.pcs.scan();
            this.party.handleChange('pc');
        }
        return result;
    }
}
