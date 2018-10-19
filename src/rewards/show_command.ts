import { ConfigurationStep, ConfigurationChooser } from "derlib/config";
import { LeagueModule } from "derlib/ddal/league_module";
import { DungeonMaster } from "derlib/ddal/dungeon_master";
import { Der20Dialog } from "derlib/roll20/dialog";
import { Result } from "derlib/config/result";

export class RenderCommand extends ConfigurationStep {
    protected dm: ConfigurationChooser<DungeonMaster>;
    protected module: ConfigurationChooser<LeagueModule>;

    constructor(dm: ConfigurationChooser<DungeonMaster>, module: ConfigurationChooser<LeagueModule>) {
        super();
        this.dm = dm;
        this.module = module;
    }

    protected tryLoad(): Result.Any {
        let result: Result.Any = new Result.Success();
        if (this.dm.localCopy == null) {
            result = this.dm.parse('');
        }
        if (this.module.localCopy == null) {
            result = this.module.parse('');
        }
        if ((result.type == Result.Type.Success) && (this.dm.localCopy == null)) {
            return new Result.Failure(new Error('no dm loaded'));
        }
        if ((result.type == Result.Type.Success) && (this.module.localCopy == null)) {
            return new Result.Failure(new Error('no module loaded'));
        }
        return result;
    }
}

export class ShowCommand extends RenderCommand {
    toJSON() {
        return undefined;
    }

    parse(line: string): Result.Any {
        // load if possible
        let result = this.tryLoad();
        if (result.type != Result.Type.Success) {
            return result;
        }
        let dialog = new Der20Dialog('!rewards-show ');
        dialog.addTitle('Log Entry for Current Session');
        dialog.addSeparator();
        dialog.addSubTitle('DM');
        dialog.beginControlGroup();
        dialog.addEditControl('Name', 'dm current name', this.dm.localCopy.name);
        dialog.addEditControl('DCI', 'dm current dci', this.dm.localCopy.dci);
        dialog.endControlGroup();
        dialog.addSeparator();
        dialog.addSubTitle('Module');
        dialog.beginControlGroup();
        dialog.addEditControl('Module Name', 'module current name', this.module.localCopy.name);
        dialog.addEditControl('Tier', 'module current tier', this.module.localCopy.tier);
        dialog.addEditControl('Start Time', 'module current start', this.module.localCopy.start);
        dialog.addEditControl('End Time', 'module current stop', this.module.localCopy.stop);
        dialog.endControlGroup();
        dialog.addSeparator();
        dialog.addSubTitle('Check Points');
        for (let check of this.module.localCopy.checkpoints.items) {
            dialog.addEditControl(`${check.name.current} (${check.value.current})`, `module current checkpoint ${check.id} awarded`, check.awarded);
        }
        dialog.addSeparator();
        // for (let item of this.module.localCopy.magicItems) {}
        dialog.addSubTitle('Magic Item');
        dialog.addSeparator();
        dialog.addSubTitle('Consumables');
        dialog.addSeparator();
        dialog.addCommand('Send to Players', 'send');
        return new Result.Dialog(Result.Dialog.Destination.Caller, dialog.render());
    }
}