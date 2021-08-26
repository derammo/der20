import { config, ConfigurationBoolean, ConfigurationString, Dialog, LargeTableItem } from 'der20/library';

export class Objective extends LargeTableItem {
    @config dm: ConfigurationBoolean = new ConfigurationBoolean(true);
    @config players: ConfigurationBoolean = new ConfigurationBoolean(true);
    @config awarded: ConfigurationBoolean = new ConfigurationBoolean(false);
    @config story: ConfigurationString = new ConfigurationString("");

    itemTitle(): string {
        return `Objective ${this.id}`;
    }

    // inline dialog elements
    buildControls(dialog: Dialog, link: Dialog.Link): void {
        dialog.addEditControl('Story Award Title', 'name', this.name, link);
        dialog.addEditControl('Story Award Text', 'story', this.story, link);
        dialog.addEditControl('Award to Players', 'players', this.players, link);
        dialog.addEditControl('Award to DM', 'dm', this.dm, link);
        dialog.addEditControl('Awarded at Start', 'awarded', this.awarded, link);
    }
}
