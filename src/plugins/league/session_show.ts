import { Dialog, DialogResult, ParserContext, Result } from 'der20/library';
import { RenderCommand } from './render';

export class SessionShowCommand extends RenderCommand {
    toJSON(): any {
        return undefined;
    }

    handleEndOfCommand(context: ParserContext): Promise<Result> {
        // load if possible
        return this.tryLoad(context)
        .then((result: Result) => {
            if (!result.isSuccess()) {
                return result;
            }
            return new DialogResult(DialogResult.Destination.caller, this.buildDialog(context).render());    
        });
    }

    private buildDialog(context: ParserContext) {
        let dialog = new context.dialog();
        const link = {
            command: context.command,
            prefix: 'session',
            followUps: [context.rest]
        };
        this.addFirstSection(dialog, link);

        this.addModuleInfo(dialog, link);

        this.addObjectives(dialog, link);

        this.addPlayers(dialog, link);

        this.addLastSection(dialog, link);

        dialog.beginControlGroup();
        dialog.addCommand('Preview & Send to Players', 'rewards preview', { command: context.command });
        dialog.endControlGroup();
        return dialog;
    }

    private addFirstSection(dialog: Dialog, link: { command: string; prefix: string; followUps: string[]; }) {
        dialog.addTitle('Log Entry for Current Session');
        dialog.addSeparator();
        dialog.addSubTitle('DM');
        dialog.beginControlGroup();
        dialog.addEditControl('Name', 'dm current name', this.dm.value().name, link);
        dialog.addEditControl('DCI', 'dm current dci', this.dm.value().dci, link);
        dialog.endControlGroup();
        dialog.addSeparator();
        dialog.addSubTitle('Module');
        dialog.beginControlGroup();
    }

    private addModuleInfo(dialog: Dialog, link: { command: string; prefix: string; followUps: string[]; }) {
        const module = this.module.value();
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
    }

    private addObjectives(dialog: Dialog, link: { command: string; prefix: string; followUps: string[]; }) {
        const module = this.module.value();
        dialog.addSubTitle('Objectives and Unlocks');
        dialog.beginControlGroup();
        for (let item of module.unlocks.value()) {
            dialog.addEditControl(`Unlocked ${item.displayName()}`, `module current unlock ${item.id} awarded`, item.awarded, link);
            if (item.awarded.value()) {
                const choices = this.party.pcs.included();
                if (choices.length > 0) {
                    item.owner.setChoices(choices.map((pc) => { return pc.character.name; }));
                    dialog.addEditControl('Picked up by', `module current unlock ${item.id} owner`, item.owner, link);
                }
            }
        }
        dialog.endControlGroup();
        dialog.addSeparator();
    }

    private addPlayers(dialog: Dialog, link: { command: string; prefix: string; followUps: string[]; }) {
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
    }

    private addLastSection(dialog: Dialog, link: { command: string; prefix: string; followUps: string[]; }) {
        dialog.addEditControl('Party Strength', 'party strength', this.party.strength, link);
        dialog.endControlGroup();
        dialog.addSeparator();

        dialog.addSubTitle('Current Totals');
        dialog.beginControlGroup();
        let count = this.party.pcs.count();
        if (count > 0) {
            dialog.addTextLine(`${count} Player Character${count !== 1 ? 's' : ''} at ${this.party.apl.value()} APL`);
        } else {
            dialog.addTextLine('No Player Characters');
        }
        dialog.endControlGroup();
        dialog.addSeparator();
    }
}
