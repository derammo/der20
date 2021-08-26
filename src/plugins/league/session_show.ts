import { ConfigurationChooser, ConfigurationFromTemplate, ConfigurationSimpleCommand, DialogResult, ParserContext, Result, Success } from 'der20/library';
import { PartyState } from './ddal/party_state';
import { DungeonMaster } from './ddal/dungeon_master';
import { LeagueModule, LeagueModuleDefinition } from './ddal/league_module';

export abstract class RenderCommand extends ConfigurationSimpleCommand {
    constructor(protected dm: ConfigurationChooser<DungeonMaster>, protected module: ConfigurationFromTemplate<LeagueModuleDefinition, LeagueModule>, protected party: PartyState) {
        super();
    }

    protected tryLoad(context: ParserContext): Result {
        let result: Result = new Success('no configuration changed');
        if (this.dm.currentValue == null) {
            result = this.dm.handleCurrent('', context, [context.rest]);
            if (!result.isSuccess()) {
                return result;
            }
        }
        if (this.module.currentValue == null) {
            result = this.module.handleCurrent('', context, [context.rest]);
            if (!result.isSuccess()) {
                return result;
            }
        }
        return result;
    }
}

export class SessionShowCommand extends RenderCommand {
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
        dialog.addEditControl('Name', 'dm current name', this.dm.currentValue.name, link);
        dialog.addEditControl('DCI', 'dm current dci', this.dm.currentValue.dci, link);
        dialog.endControlGroup();
        dialog.addSeparator();
        dialog.addSubTitle('Module');
        dialog.beginControlGroup();
        let module = this.module.currentValue;
        dialog.addEditControl('Module Name', 'module current name', module.name, link);
        dialog.addEditControl('Season', 'module current season', module.season, link);
        dialog.addEditControl('Hardcover', 'module current hardcover', module.hardcover, link);
        dialog.addSeparator();
        dialog.addEditControl('Tier', 'module current tier', module.tier, link);
        dialog.addEditControl('Minimum Level', 'module current level minimum', module.level.minimum, link);
        dialog.addEditControl('Maximum Level', 'module current level maximum', module.level.maximum, link);
        dialog.addEditControl('Target APL', 'module current target apl', module.target.apl, link);
        dialog.addSeparator();
        dialog.addEditControl('Maximum Duration', 'module current duration', module.duration, link);
        dialog.addEditControl('Start Time', 'start', module.start, link);
        dialog.addEditControl('End Time', 'module current stop', module.stop, link);
        dialog.endControlGroup();
        dialog.addSeparator();
        dialog.addSubTitle('Objectives and Unlocks');
        dialog.beginControlGroup();
        for (let item of module.unlocks.currentValue) {
            dialog.addEditControl(`Unlocked ${item.displayName()}`, `module current unlock ${item.id} awarded`, item.awarded, link);
            if (item.awarded.value()) {
                const choices = this.party.pcs.included();
                if (choices.length > 0) {
                    item.owner.setChoices(choices.map((pc) => { return pc.character.name }));
                    dialog.addEditControl('Picked up by', `module current unlock ${item.id} owner`, item.owner, link);
                }
            }
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

        dialog.addSubTitle('Current Totals');
        dialog.beginControlGroup();
        let count = this.party.pcs.count();
        if (count > 0) {
            dialog.addTextLine(`${count} Player Character${count!==1?'s':''} at ${this.party.apl.value()} APL`);
        } else {
            dialog.addTextLine('No Player Characters');
        }
        dialog.endControlGroup();
        dialog.addSeparator();
        dialog.beginControlGroup();
        dialog.addCommand('Preview & Send to Players', 'rewards preview', { command: context.command });
        dialog.endControlGroup();
        return new DialogResult(DialogResult.Destination.Caller, dialog.render());
    }
}
