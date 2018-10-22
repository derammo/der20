import { RenderCommand } from './show_command';
import { Der20Dialog } from 'derlib/roll20/dialog';
import { Result } from 'derlib/config/result';

export class SendCommand extends RenderCommand {
    toJSON() {
        return undefined;
    }

    parse(line: string): Result.Any {
        this.tryLoad();

        // XXX HACK TEST
        let importQuery =
            'http://localhost:3000/character_log_imports/new?character_log_entry%5Badvancement_checkpoints%5D=4&character_log_entry%5Badventure_title%5D=Imported+Wonder+Land&character_log_entry%5Bmagic_items_attributes%5D%5B1%5D%5B_destroy%5D=false&character_log_entry%5Bmagic_items_attributes%5D%5B1%5D%5Bcharacter_id%5D=17&character_log_entry%5Bmagic_items_attributes%5D%5B1%5D%5Bid%5D=1&character_log_entry%5Bmagic_items_attributes%5D%5B1%5D%5Blocation_found%5D=&character_log_entry%5Bmagic_items_attributes%5D%5B1%5D%5Bname%5D=Axe+of+Wow&character_log_entry%5Bmagic_items_attributes%5D%5B1%5D%5Bnot_included_in_count%5D=false&character_log_entry%5Bmagic_items_attributes%5D%5B1%5D%5Bnotes%5D=&character_log_entry%5Bmagic_items_attributes%5D%5B1%5D%5Brarity%5D=very_rare&character_log_entry%5Bmagic_items_attributes%5D%5B1%5D%5Btable%5D=H&character_log_entry%5Bmagic_items_attributes%5D%5B1%5D%5Btable_result%5D=&character_log_entry%5Bmagic_items_attributes%5D%5B1%5D%5Btier%5D=2&character_log_entry%5Btier%5D=2&character_log_entry%5Btreasure_checkpoints%5D=4';
        let dialog = new Der20Dialog('');
        dialog.addExternalLinkButton('Import Test', importQuery);

        // XXX make this a class that takes over the "hasResult" functionality and can accumulate errors (?), enum viewer { caller, gm, all }
        // return new Result.Failure(new Error('send command is unimplemented'));

        return new Result.Dialog(Result.Dialog.Destination.All, dialog.render());
    }
}
