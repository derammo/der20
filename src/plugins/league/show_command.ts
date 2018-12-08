import { ConfigurationChooser, ConfigurationFromTemplate, ConfigurationSimpleCommand, DialogResult, ParserContext, Result, Success } from 'der20/library';
import { PartyState } from './ddal/party_state';
import { DungeonMaster } from './ddal/dungeon_master';
import { LeagueModule, LeagueModuleDefinition } from './ddal/league_module';

export abstract class RenderCommand extends ConfigurationSimpleCommand {
    constructor(protected dm: ConfigurationChooser<DungeonMaster>, protected module: ConfigurationFromTemplate<LeagueModuleDefinition, LeagueModule>, protected party: PartyState) {
        super();
        // generated code
    }

    protected tryLoad(context: ParserContext): Result {
        let result: Result = new Success('no configuration changed');
        if (this.dm.current == null) {
            result = this.dm.handleCurrent('', context, [context.rest]);
            if (!result.isSuccess()) {
                return result;
            }
        }
        if (this.module.current == null) {
            result = this.module.handleCurrent('', context, [context.rest]);
            if (!result.isSuccess()) {
                return result;
            }
        }
        return result;
    }
}

export class ShowCommand extends RenderCommand {
    toJSON(): any {
        return undefined;
    }

    handleEndOfCommand(context: ParserContext): Result {
        // load if possible
        let result = this.tryLoad(context);
        if (!result.isSuccess()) {
            return result;
        }
        let dialog = new context.dialog();
        const link = { 
            command: context.command, 
            prefix: 'session',
            followUps: [ context.rest ]
        };
        dialog.addTitle('Log Entry for Current Session');
        dialog.addSeparator();
        dialog.addSubTitle('DM');
        dialog.beginControlGroup();
        dialog.addEditControl('Name', 'dm current name', this.dm.current.name, link);
        dialog.addEditControl('DCI', 'dm current dci', this.dm.current.dci, link);
        dialog.endControlGroup();
        dialog.addSeparator();
        dialog.addSubTitle('Module');
        dialog.beginControlGroup();
        let module = this.module.current;
        dialog.addEditControl('Module Name', 'module current name', module.name, link);
        dialog.addEditControl('Season', 'module current season', module.season, link);
        dialog.addEditControl('Hard Cover', 'module current hardcover', module.hardcover, link);
        dialog.addSeparator();
        dialog.addEditControl('Tier', 'module current tier', module.tier, link);
        dialog.addEditControl('Minimum Level', 'module current level minimum', module.level.minimum, link);
        dialog.addEditControl('Maximum Level', 'module current level maximum', module.level.maximum, link);
        dialog.addEditControl('Target APL', 'module current target apl', module.target.apl, link);
        dialog.addSeparator();
        dialog.addEditControl('Advancement/hr', 'module current hourly advancement', module.hourly.advancement, link);
        dialog.addEditControl('Treasure/hr', 'module current hourly treasure', module.hourly.treasure, link);
        dialog.addEditControl('Maximum Duration', 'module current duration', module.duration, link);
        dialog.addEditControl('Start Time', 'start', module.start, link);
        dialog.addEditControl('End Time', 'module current stop', module.stop, link);
        dialog.endControlGroup();
        dialog.addSeparator();
        dialog.addSubTitle('Objectives and Unlocks');
        dialog.beginControlGroup();
        for (let objective of module.objectives.current) {
            const label = `${objective.name.value()} (${objective.advancement.value()} ACP, ${objective.treasure.value()} TCP)`;
            dialog.addEditControl(label, `module current objective ${objective.id} awarded`, objective.awarded, link);
        }
        for (let item of module.unlocks.current) {
            const label = `Unlocked ${item.name.value()}`;
            dialog.addEditControl(label, `module current unlock ${item.id} awarded`, item.awarded, link);
        }
        dialog.endControlGroup();
        dialog.addSeparator();

        // select from all player controlled creatures for automatic APL and to include/exclude in rewards
        dialog.addSubTitle('Players');
        dialog.beginControlGroup();
        for (let pc of this.party.pcs.characters) {
            let levelString = '';
            let level = pc.character.attribute('level').value(0);
            if (level > 0) {
                levelString = ` (level ${level})`;
            }
            dialog.addEditControl(
                `${pc.player.name}: ${pc.character.name}${levelString}`,
                `party pc ${pc.player.userid} character ${pc.character.id} selected`,
                pc.selected,
                link
            );
        }
        dialog.addEditControl('Party Strength', 'party strength', this.party.strength, link);
        dialog.endControlGroup();
        dialog.addSeparator();

        // dialog.addSubTitle('Consumables');
        // REVISIT put a section here to provider a player picker for who received what consumable (needs support in league module definition)
        // dialog.addSeparator();

        dialog.addSubTitle('Current Totals');
        dialog.beginControlGroup();
        let count = this.party.pcs.count();
        if (count > 0) {
            dialog.addTextLine(`${count} Player Character${count!==1?'s':''} at ${this.party.apl.value()} APL`);
        } else {
            dialog.addTextLine('No Player Characters');
        }
        if (module.hasTierRewardsDifference()) {
            // if hard cover, double treasure award for Tier 3+ characters
            dialog.addTextLine(`${module.advancementAward()} ACP, ${module.treasureAward()} TCP for Tier 1 & 2 Characters`);
            const explicitAwards = module.objectives.current.some(objective => {
                return objective.awarded.value();
            });
            if (explicitAwards) {
                // there should not be explicit check point awards in a hard cover, because the rules assume
                // time-based awards, so make the DM figure this out if the rules allow this in the future
                dialog.addTextLine(`You must manually calculate the treasure award for Tier 3 & 4 Characters`);
            } else {
                dialog.addTextLine(`${module.advancementAward()} ACP, ${2 * module.treasureAward()} TCP for Tier 3 & 4 Characters`);
            }
        } else {
            dialog.addTextLine(`${module.advancementAward()} ACP, ${module.treasureAward()} TCP`);
        }
        dialog.endControlGroup();
        dialog.addSeparator();
        dialog.beginControlGroup();
        dialog.addCommand('Preview & Send to Players', 'rewards preview', { command: context.command });
        dialog.endControlGroup();
        return new DialogResult(DialogResult.Destination.Caller, dialog.render());
    }
}
