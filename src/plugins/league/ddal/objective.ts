import { ConfigurationBoolean, ConfigurationInteger, ConfigurationString, ConfigurationValue, Dialog, DialogAware } from 'der20/library';

export class Objective implements DialogAware {
    // can't be undefined, because we need to detect that we can load it
    id: string = null;

    name: ConfigurationString = new ConfigurationString(ConfigurationValue.UNSET);
    advancement: ConfigurationInteger = new ConfigurationInteger(1);
    treasure: ConfigurationInteger = new ConfigurationInteger(1);
    dm: ConfigurationBoolean = new ConfigurationBoolean(true);
    players: ConfigurationBoolean = new ConfigurationBoolean(true);
    awarded: ConfigurationBoolean = new ConfigurationBoolean(false);

    buildControls(dialog: Dialog, link: Dialog.Link): void {
        dialog.addEditControl('Objective Name', 'name', this.name, link);
        dialog.addEditControl('Advancement Checkpoints', 'advancement', this.advancement, link);
        dialog.addEditControl('Treasure Checkpoints', 'treasure', this.treasure, link);
        dialog.addEditControl('Award to Players', 'players', this.players, link);
        dialog.addEditControl('Award to DM', 'dm', this.dm, link);
    }
}
