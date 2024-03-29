import { DialogResult, Success } from "der20/config/result";
import { CollectionItem, ConfigurationValue } from "der20/interfaces/config";
import { ConfigurationTermination, ParserContext } from "der20/interfaces/parser";
import { Result } from "der20/interfaces/result";
import { Dialog, DialogAware } from "der20/interfaces/ui";
import { ConfigurationArray } from "./array";
import { config } from "./decorators";
import { ConfigurationString } from "./string";

/**
 * Collection item with complex configuration, which supports its own configuration
 * dialog so that it does not have to be repeatedly inlined into a dialog.
 */
export abstract class LargeTableItem implements DialogAware, CollectionItem, ConfigurationTermination {
    // can't be undefined, because we need to detect that we can load it
    id: string = null;

    @config name: ConfigurationString = new ConfigurationString(ConfigurationValue.UNSET);
    
    abstract buildControls(dialog: Dialog, link: Dialog.Link): void;
    abstract itemTitle(): string;

    // REVISIT: factor this to base class of unlock and objective
    // separate dialog for editing just this item
    handleEndOfCommand(context: ParserContext): Promise<Result> {
        if (!context.rest.startsWith('define ')) {
            return new Success('no configuration changed').resolve();
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
        dialog.addEditCommand(`<h4 style="display: inline-block">${this.itemTitle()}</h4>`, 'Delete', ConfigurationArray.deleteCommandSuffix, deleteLink);
        this.buildControls(dialog, link);
        dialog.addEditCommand('Show Parent', 'Done', deleteLink.followUps[0], { command: context.command });
        dialog.endControlGroup();
        return new DialogResult(DialogResult.Destination.caller, dialog.render()).resolve();
    }
       
}