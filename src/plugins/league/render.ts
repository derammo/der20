import { ConfigurationChooser, ConfigurationFromTemplate, ConfigurationSimpleCommand, ParserContext, Result, ResultBuilder } from 'der20/library';
import { PartyState } from './ddal/party_state';
import { DungeonMaster } from './ddal/dungeon_master';
import { LeagueModule, LeagueModuleDefinition } from './ddal/league_module';

export abstract class RenderCommand extends ConfigurationSimpleCommand {
    constructor(protected dm: ConfigurationChooser<DungeonMaster>, protected module: ConfigurationFromTemplate<LeagueModuleDefinition, LeagueModule>, protected party: PartyState) {
        super();
    }

    protected tryLoad(context: ParserContext): Promise<Result> {
        let changes: Promise<Result>[] = [];
        if (!this.dm.hasConfiguredValue()) {
            changes.push(this.dm.handleCurrent('', context, [context.rest]));
        }
        if (!this.module.hasConfiguredValue()) {
            changes.push(this.module.handleCurrent('', context, [context.rest]));
        }
        return Promise.all(changes)
            .then(ResultBuilder.combined);
    }
}
