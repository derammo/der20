import { ConfigurationStep, ConfigurationCommand } from 'derlib/config/atoms';
import { LeagueModule } from 'derlib/ddal/league_module';
import { DungeonMaster } from 'derlib/ddal/dungeon_master';
import { Der20Dialog } from 'derlib/roll20/dialog';
import { Result } from 'derlib/config/result';
import { ConfigurationChooser } from 'derlib/config/array';

export abstract class RenderCommand extends ConfigurationCommand {
    protected dm: ConfigurationChooser<DungeonMaster>;
    protected module: ConfigurationChooser<LeagueModule>;

    constructor(dm: ConfigurationChooser<DungeonMaster>, module: ConfigurationChooser<LeagueModule>) {
        super();
        this.dm = dm;
        this.module = module;
    }

    protected tryLoad(): Result.Any {
        let result: Result.Any = new Result.Success('no configuration changed');
        if (this.dm.current == null) {
            result = this.dm.parse('');
        }
        if (this.module.current == null) {
            result = this.module.parse('');
        }
        if (result.kind === Result.Kind.Success && this.dm.current == null) {
            return new Result.Failure(new Error('no dm loaded'));
        }
        if (result.kind === Result.Kind.Success && this.module.current == null) {
            return new Result.Failure(new Error('no module loaded'));
        }
        return result;
    }
}

export class ShowCommand extends RenderCommand {
    toJSON(): any {
        return undefined;
    }

    parse(line: string): Result.Any {
        // load if possible
        let result = this.tryLoad();
        switch (result.kind) {
            case Result.Kind.Success:
                break;
            default:
                return result;
        }
        let dialog = new Der20Dialog('!rewards-show ');
        dialog.addTitle('Log Entry for Current Session');
        dialog.addSeparator();
        dialog.addSubTitle('DM');
        dialog.beginControlGroup();
        dialog.addEditControl('Name', 'dm current name', this.dm.current.name);
        dialog.addEditControl('DCI', 'dm current dci', this.dm.current.dci);
        dialog.endControlGroup();
        dialog.addSeparator();
        dialog.addSubTitle('Module');
        dialog.beginControlGroup();
        let module = this.module.current;
        dialog.addEditControl('Module Name', 'module current name', module.name);
        dialog.addEditControl('Season', 'module current season', module.season);
        dialog.addEditControl('Hard Cover', 'module current hardcover', module.hardcover);
        dialog.addEditControl('Tier', 'module current tier', module.tier);
        dialog.addEditControl('Minimum Level', 'module current level minimum', module.level.minimum);
        dialog.addEditControl('Maximum Level', 'module current level maximum', module.level.maximum);
        dialog.addEditControl('Advancement/hr', 'module current hourly advancement', module.hourly.advancement);
        dialog.addEditControl('Treasure/hr', 'module current hourly treasure', module.hourly.treasure);
        dialog.addEditControl('Maximum Duration', 'module current duration', module.duration);
        dialog.addEditControl('Start Time', 'module current start', module.start);
        dialog.addEditControl('End Time', 'module current stop', module.stop);
        dialog.endControlGroup();
        dialog.addSeparator();
        dialog.addSubTitle('Check Points and Unlocks');
        dialog.beginControlGroup();
        for (let check of module.checkpoints.current) {
            const label = `${check.name.value()} (${check.advancement.value()} ACP, ${check.treasure.value()} TCP)`;
            dialog.addEditControl(label, `module current checkpoint ${check.id} awarded`, check.awarded);
        }
        for (let item of module.unlocks.current) {
            const label = `Unlocked ${item.name.value()}`;
            dialog.addEditControl(label, `module current unlock ${item.id} awarded`, item.awarded);
        }
        dialog.endControlGroup();
        dialog.addSeparator();
        dialog.addSubTitle('Consumables');
        // XXX put a section here to provider a player picker for who received what consumable
        dialog.addSeparator();
        dialog.addSubTitle('Current Totals');
        dialog.beginControlGroup();
        if (module.hardcover.value() && (module.level.maximum.value() > 10)) {
            // if hard cover, double treasure award for Tier 3+ characters
            dialog.addTextLine(`${module.advancementAward()} ACP, ${module.treasureAward()} TCP for Tier 1 & 2 Characters`);
            const explicitAwards = module.checkpoints.current.some((checkpoint) => { return checkpoint.awarded.value(); });
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
        dialog.addCommand('Preview & Send to Players', 'preview');
        return new Result.Dialog(Result.Dialog.Destination.Caller, dialog.render());
    }
}
