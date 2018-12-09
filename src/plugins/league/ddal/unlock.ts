import { ConfigurationBoolean, ConfigurationChangeHandling, ConfigurationEnumerated, ConfigurationInteger, ConfigurationString, ConfigurationValue, Dialog, LargeTableItem, format } from 'der20/library';

// can't use enum type in generic, so we use a list of possible values instead
export const Rarity: string[] = [ "Common", "Uncommon", "Rare", "Very Rare", "Legendary", "Artifact", "Unique" ];

export class UnlockDefinition extends LargeTableItem implements ConfigurationChangeHandling {
    // can't be undefined, because we need to detect that we can load it
    id: string = null;

    // name of item
    name: ConfigurationString = new ConfigurationString(ConfigurationValue.UNSET);

    // is this a consumable? i.e., may this be kept at the end of the adventure?
    consumable: ConfigurationBoolean = new ConfigurationBoolean(false);

    // item description including flavor text
    description: ConfigurationString = new ConfigurationString(ConfigurationValue.UNSET);

    // location in the module where it was found, to differentiate multiple copies of same item
    location: ConfigurationString = new ConfigurationString(ConfigurationValue.UNSET);

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

    handleChange(changedKeyword: string): void {
        if (changedKeyword === 'name') {
            // REVISIT look through all module definitions, starting with the current one, and copy all the other values (except for location)
            // for any values that are UNSET in this instance
            // REVISIT: how would we do that?  we can't access the parser stack in change handlers (intentionally) so is there some other way to deal with this advanced case?
            // NOTE: if we put the current call stack in the context as discussed elsewhere, maybe this could be an advanced parse() implementation?
            // XXX better idea: since this would make configuration command order-dependent, instead just show a button when an unlock has only had its name configured and is elsewhere available to "Copy existing..."
            // NOTE: we still need to reach up the stack frames to find the module and the collection of modules
        }
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
    owner: ConfigurationEnumerated = new ConfigurationEnumerated(ConfigurationValue.UNSET, ['']);
}

