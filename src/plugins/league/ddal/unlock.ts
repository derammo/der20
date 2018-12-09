import { ConfigurationBoolean, ConfigurationEnumerated, ConfigurationInteger, ConfigurationString, ConfigurationValue, Dialog, DialogAware, ConfigurationChangeHandling } from 'der20/library';

// can't use enum type in generic, so we use a list of possible values instead
export const Rarity: string[] = [ "Common", "Uncommon", "Rare", "Very Rare", "Legendary", "Artifact", "Unique" ];

export class UnlockDefinition implements DialogAware, ConfigurationChangeHandling {
    // can't be undefined, because we need to detect that we can load it
    id: string = null;

    // name of item
    name: ConfigurationString = new ConfigurationString(ConfigurationValue.UNSET);

    // location in the module where it was found, to differentiate multiple copies of same item
    location: ConfigurationString = new ConfigurationString(ConfigurationValue.UNSET);

    // item description including flavor text
    description: ConfigurationString = new ConfigurationString(ConfigurationValue.UNSET);

    // rarity value, capitalized 
    rarity: ConfigurationEnumerated = new ConfigurationEnumerated(ConfigurationValue.UNSET, Rarity);

    // tier restriction for item
    tier: ConfigurationInteger = new ConfigurationInteger(ConfigurationValue.UNSET);

    // item is considered to be from this table for trading purposes
    table: ConfigurationString = new ConfigurationString(ConfigurationValue.UNSET);

    // can unlock be awarded to players?
    players: ConfigurationBoolean = new ConfigurationBoolean(true);

    // can unlock be awarded to DM?
    dm: ConfigurationBoolean = new ConfigurationBoolean(false);

    // actually awarded?
    awarded: ConfigurationBoolean = new ConfigurationBoolean(false);

    buildControls(dialog: Dialog, link: Dialog.Link): void {
        dialog.addEditControl('Item Name', 'name', this.name, link);
        dialog.addEditControl('Description', 'description', this.description, link);
        dialog.addEditControl('Location Found', 'location', this.location, link);
        dialog.addEditControl('Rarity', 'rarity', this.rarity, link);
        dialog.addEditControl('Item Tier', 'tier', this.tier, link);
        dialog.addEditControl('DMG Table', 'table', this.table, link);
        dialog.addEditControl('Award to Players', 'players', this.players, link);
        dialog.addEditControl('Award to DM', 'dm', this.dm, link);
        dialog.addEditControl('Awarded at Start', 'awarded', this.awarded, link);
    }

    handleChange(changedKeyword: string): void {
        if (changedKeyword === 'name') {
            // XXX look through all module definitions, starting with the current one, and copy all the other values (except for location)
            // for any values that are UNSET in this instance
        }
    }
}

export class Unlock extends UnlockDefinition {
    // name of player character who picked up the item
    // owner: ConfigurationString = new ConfigurationString(ConfigurationValue.UNSET);
}

