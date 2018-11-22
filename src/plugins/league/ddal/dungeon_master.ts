import { ConfigurationString, ConfigurationValue, ConfigurationTermination, DialogResult, ParserContext, Result, Success } from "der20/library";

export class DungeonMaster implements ConfigurationTermination {
    // can't be undefined, because we need to detect that we can load it
    id: string = null;
    
    name: ConfigurationString = new ConfigurationString(ConfigurationValue.UNSET);
    dci: ConfigurationString = new ConfigurationString(ConfigurationValue.UNSET);

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
        dialog.addTitle(`Definition for DM '${this.id}'`);
        dialog.beginControlGroup();
        dialog.addEditControl('Full Name', 'name', this.name, link);
        dialog.addEditControl('DCI Number', 'dci', this.dci, link);
        dialog.endControlGroup();
        return new DialogResult(DialogResult.Destination.Caller, dialog.render());
    }
}
