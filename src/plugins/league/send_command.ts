import { ConfigurationChooser, ConfigurationFromTemplate, DialogResult, Failure, ParserContext, Result } from 'der20/library';
import { AdventurersLeagueLog } from './adventurers_league_log';
import { DungeonMaster } from './ddal/dungeon_master';
import { LeagueModule, LeagueModuleDefinition } from './ddal/league_module';
import { Rules } from './rules';
import { RenderCommand } from './show_command';
import { PartyState } from './ddal/party_state';

export class SendCommand extends RenderCommand {
    constructor(
        dm: ConfigurationChooser<DungeonMaster>,
        module: ConfigurationFromTemplate<LeagueModuleDefinition, LeagueModule>,
        private rules: Rules,
        party: PartyState,
        private preview: boolean
    ) {
        super(dm, module, party);
        // generated code
    }

    toJSON(): any {
        return undefined;
    }

    handleEndOfCommand(context: ParserContext): Result {
        this.tryLoad(context);

        let dialog = new context.dialog();
        let destination = DialogResult.Destination.Caller;

        let module = this.module.current;
        if (module === undefined) {
            return new Failure(new Error('no current module set; please select a module before calling this command'));
        }

        const dm = this.dm.current.name.value();
        const dci = this.dm.current.dci.value();
        const acp = module.advancementAward();
        const tcp = module.treasureAward();
        const downtime = this.rules.advancement.downtime.valueFrom(acp);
        const renown = this.rules.advancement.renown.valueFrom(acp);
        const moduleName = module.name.value();
        const tier = module.tier.value();

        dialog.addTitle(moduleName);
        dialog.beginControlGroup();
        dialog.addTextLine(`Tier ${tier} ${module.hardcover.value()?'Hardcover':'Module'}`);
        if (module.session.hasValue()) {
            dialog.addTextLine(`Session ${module.session.value()}`);
        }
        dialog.addTextLine(`Played: ${dialog.getDateText(module.start.value())}`);
        dialog.addTextLine(`DM: ${dm} (DCI ${dci})`);
        dialog.endControlGroup();

        dialog.addSeparator();
        dialog.beginControlGroup();

        // REVISIT: add hours played for clarity

        dialog.addTextLine(`${acp} Advancement CP`);
        if (module.hasTierRewardsDifference()) {
            // if hardcover, double treasure award for Tier 3+ characters
            dialog.addTextLine(`${tcp} Treasure CP for Tier 1 & 2 Characters`);
            const explicitCheckpoints = module.objectives.current.some((objective: any) => {
                return objective.awarded.value();
            });
            if (explicitCheckpoints) {
                // there should not be explicit check point awards in a hardcover, because the rules assume
                // time-based awards, so make the DM figure this out if the rules allow this in the future
                dialog.addTextLine(`Ask your DM for the treasure award for Tier 3 & 4 Characters`);
            } else {
                dialog.addTextLine(`${2 * tcp} Treasure CP for Tier 3 & 4 Characters`);
            }
        } else {
            dialog.addTextLine(`${tcp} Treasure CP`);
        }
        dialog.addTextLine(`${downtime} Downtime`);
        dialog.addTextLine(`${renown} Renown`);
        dialog.endControlGroup();
        dialog.addSeparator();

        // unlocks for all players, includes consumables
        for (let unlock of module.uniqueUnlocks()) {
            const item = unlock.item;
            let suffix = '';
            if (unlock.count > 1) {
                suffix = ` (x${unlock.count})`;
            }
            dialog.addSubTitle(`Unlocked ${item.name.value()}${suffix}`);
            dialog.beginControlGroup();
            dialog.addTextLine(`${item.rarity.value()} ${item.consumable.value()?'Consumable':'Magic Item'} on Table ${item.table.value()}`);
            dialog.addTextLine(item.description.value());
            dialog.endControlGroup();
            dialog.addSeparator();
        }

        let includedPcs = this.party.pcs.included();
        if (includedPcs.length > 0) {
            dialog.addSubTitle('Awarded to:');
            dialog.beginControlGroup();
            for (let pc of includedPcs) {
                let levelString = '';
                let level = pc.character.attribute('level').value(0);
                if (level > 0) {
                    levelString = ` (level ${level})`;
                }
                dialog.addTextLine(`${pc.character.name}${levelString}`);
            }
            dialog.endControlGroup();
            dialog.addSeparator();
        }

        // make sorted list of assigned consumables
        const consumables = module.unlocks.current.filter(item => {
            return item.consumable.value() && item.awarded.value() && item.owner.hasConfiguredValue();
        });
        consumables.sort((left, right) => {
            return left.owner.value().localeCompare(right.owner.value());
        });

        if (consumables.length > 0) {
            dialog.addSubTitle('Consumables:');
            dialog.beginControlGroup();
            for (let item of consumables) {
                dialog.addTextLine(`${item.owner.value().split(' ')[0]} picked up ${item.displayName()}`);
                dialog.addIndentedTextLine(`${item.rarity.value()} Consumable on Table ${item.table.value()}`);
                if (item.description.hasValue()) {
                    dialog.addIndentedTextLine(item.description.value());
                }
            }
            dialog.endControlGroup();
            dialog.addSeparator();
        }

        if (this.preview) {
            dialog.addCommand('Send to Players', 'rewards send', { command: context.command });
        } else {
            destination = DialogResult.Destination.All;
            let log = new AdventurersLeagueLog.LogEntry();
            log.advancement_checkpoints = acp;
            log.adventure_title = moduleName;
            log.dm_dci_number = dci;
            log.dm_name = dm;
            log.downtime_gained = downtime;
            log.magic_items_attributes = [];
            log.notes = undefined; // XXX
            log.renown_gained = renown;
            log.treasure_checkpoints = tcp;
            log.treasure_tier = tier;

            for (let item of module.unlocks.current) {
                if (!item.awarded.value()) {
                    continue;
                }
                let magicItem = new AdventurersLeagueLog.MagicItem();
                magicItem.location_found = moduleName;
                magicItem.name = item.name.value();
                magicItem.notes = item.description.value();
                magicItem.rarity = AdventurersLeagueLog.Rarity[item.rarity.value()];
                magicItem.table = item.table.value();
                magicItem.table_result = undefined;
                magicItem.tier = item.tier.value();
                log.magic_items_attributes.push(magicItem);
            }

            // XXX include character names that participated, in an array outside the log entry, so we can try to match them in the log site for auto-selection

            // XXX shorten character_log_entry and magic_items_attributes both here and in the import controller on the server
            // XXX to enable this, we need to finish https://github.com/Ariel-Thomas/adventurers-league-log/issues/157
            // let parameters = AdventurersLeagueLog.createRailsQueryString(log, 'character_log_entry');
            // XXX HACK TEST local server
            // let importQuery = `http://localhost:3000/character_log_imports/new?${parameters}`;
            // dialog.addExternalLinkButton('Import to adventurersleaguelog.com', importQuery);
        }

        return new DialogResult(destination, dialog.render());
    }
}
