import { ConfigurationBoolean, ConfigurationInteger, Dialog, LargeTableItem } from 'der20/library';

export class Objective extends LargeTableItem {
    advancement: ConfigurationInteger = new ConfigurationInteger(1);
    treasure: ConfigurationInteger = new ConfigurationInteger(1);
    dm: ConfigurationBoolean = new ConfigurationBoolean(true);
    players: ConfigurationBoolean = new ConfigurationBoolean(true);
    awarded: ConfigurationBoolean = new ConfigurationBoolean(false);
           
    itemTitle(): string {
        return `Objective ${this.id}`;
    }

    // inline dialog elements
    buildControls(dialog: Dialog, link: Dialog.Link): void {
        dialog.addEditControl('Objective Name', 'name', this.name, link);
        dialog.addEditControl('Advancement Checkpoints', 'advancement', this.advancement, link);
        dialog.addEditControl('Treasure Checkpoints', 'treasure', this.treasure, link);
        dialog.addEditControl('Award to Players', 'players', this.players, link);
        dialog.addEditControl('Award to DM', 'dm', this.dm, link);
    }
}
