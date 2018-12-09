import { DialogAware, Dialog } from "der20/interfaces/ui";
import { ParserContext, ConfigurationTermination } from "der20/interfaces/parser";
import { Result } from "der20/interfaces/result";
import { CollectionItem, ConfigurationValue } from "der20/interfaces/config";
import { Success, DialogResult } from "der20/config/result";
import { ConfigurationArray } from "./array";
import { ConfigurationString } from "./string";

export abstract class LargeTableItem implements DialogAware, CollectionItem, ConfigurationTermination {
    // can't be undefined, because we need to detect that we can load it
    id: string = null;
    name: ConfigurationString = new ConfigurationString(ConfigurationValue.UNSET);
    
    abstract buildControls(dialog: Dialog, link: Dialog.Link): void;
    abstract itemTitle(): string;

    // REVISIT: factor this to base class of unlock and objective
    // separate dialog for editing just this item
    handleEndOfCommand(context: ParserContext): Result {
        if (!context.rest.startsWith('define ')) {
            return new Success('no configuration changed');
        }
        let dialog = new context.dialog();
        const link = { 
            command: context.command,
            prefix: context.rest,
            followUps: [ context.rest ]
        };
        const deleteLink = { 
            command: context.command,
            prefix: context.rest,
            // replace reference to this item to create follow up link to parent
            followUps: [ context.rest.replace(new RegExp(`[^ ]+ +${this.id}$`), '') ]
        };
        dialog.beginControlGroup();
        dialog.addEditCommand(`<h4 style="display: inline-block">${this.itemTitle()}</h4>`, 'Delete', ConfigurationArray.DELETE_COMMAND_SUFFIX, deleteLink);
        this.buildControls(dialog, link);
        dialog.addEditCommand('Show Parent', 'Done', deleteLink.followUps[0], { command: context.command });
        dialog.endControlGroup();
        return new DialogResult(DialogResult.Destination.Caller, dialog.render());
    }
       
}