import { ConfigurationBoolean, ConfigurationEnumerated, ConfigurationInteger, ConfigurationString, ConfigurationValue, Dialog, LargeTableItem, format, config } from 'der20/library';

// can't use enum type in generic, so we use a list of possible values instead
export const Rarity: string[] = [ "Common", "Uncommon", "Rare", "Very Rare", "Legendary", "Artifact", "Unique" ];

export class UnlockDefinition extends LargeTableItem {
    // can't be undefined, because we need to detect that we can load it
    id: string = null;

    // name of item
    @config name: ConfigurationString = new ConfigurationString(ConfigurationValue.UNSET);

    // is this a consumable? i.e., may this be kept at the end of the adventure?
    @config consumable: ConfigurationBoolean = new ConfigurationBoolean(false);

    // item description including flavor text
    @config description: ConfigurationString = new ConfigurationString(ConfigurationValue.UNSET);

    // location in the module where it was found, to differentiate multiple copies of same item
    @config location: ConfigurationString = new ConfigurationString(ConfigurationValue.UNSET);

    // rarity value, capitalized 
    @config rarity: ConfigurationEnumerated = new ConfigurationEnumerated(ConfigurationValue.UNSET, Rarity);

    // tier restriction for item
    @config tier: ConfigurationInteger = new ConfigurationInteger(ConfigurationValue.UNSET);

    // item is considered to be from this table for trading purposes
    @config table: ConfigurationString = new ConfigurationString(ConfigurationValue.UNSET);

    // can unlock be awarded to players?
    @config players: ConfigurationBoolean = new ConfigurationBoolean(true);

    // can unlock be awarded to DM?
    @config dm: ConfigurationBoolean = new ConfigurationBoolean(false);

    // actually awarded?
    @config awarded: ConfigurationBoolean = new ConfigurationBoolean(false);

    // inline dialog elements
    buildControls(dialog: Dialog, link: Dialog.Link): void {
        dialog.addEditControl('Item Name', 'name', this.name, link);
        if (this.name.hasConfiguredValue() && ![this.consumable, this.description, this.location, this.rarity, this.tier, this.table, this.players, this.dm, this.awarded].some((item) => { return item.hasConfiguredValue()})) {
            // nothing configured except name
            const rootLink: Dialog.Link = {
                command: link.command,
                followUps: link.followUps
            };
            dialog.addEditCommand('Copy Existing Item', 'Fill', link.prefix.replace(/^define /, 'populate '), rootLink)
        }
        dialog.addEditControl('Consumable', 'consumable', this.consumable, link);
        dialog.addEditControl('Description', 'description', this.description, link);
        dialog.addEditControl('Location Found', 'location', this.location, link);
        dialog.addEditControl('Rarity', 'rarity', this.rarity, link);
        dialog.addEditControl('Item Tier', 'tier', this.tier, link);
        dialog.addEditControl('DMG Table', 'table', this.table, link);
        dialog.addEditControl('Award to Players', 'players', this.players, link);
        dialog.addEditControl('Award to DM', 'dm', this.dm, link);
        dialog.addEditControl('Awarded at Start', 'awarded', this.awarded, link);
    }
       
    itemTitle(): string {
        return `Unlock ${this.id}`;
    }

    displayName(): string {
        if (!this.location.hasValue()) {
            return this.name.value();
        }
        return `${this.name.value()} (${this.location.value()})`;
    }
}

export class Unlock extends UnlockDefinition {
    // name of player character who picked up the item, will be changed to allow selection from characters at run time
    @format('STRING')
    @config owner: ConfigurationEnumerated = new ConfigurationEnumerated(ConfigurationValue.UNSET, ['']);
}

