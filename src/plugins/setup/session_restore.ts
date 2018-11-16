import { Der20Token } from 'der20/library';
import { ParserContext } from 'der20/library';
import { Result, Change, Success } from 'der20/library';
import { PositionData } from './data';
import { ConfigurationSimpleCommand } from 'der20/library';
import { TokenResetCommand } from './reset';

export class SessionRestoreCommand extends ConfigurationSimpleCommand {
    constructor(private data: PositionData) {
        super();
        // generated code
    }

    handleEndOfCommand(parserContext: ParserContext): Result {
        let changes = false;
        for (let record of Object.keys(this.data.dictionary)) {
            let token = Der20Token.fetch({ id: record });
            if (token === undefined) {
                // no longer exists, clean up
                delete this.data.dictionary[record];
                changes = true;
                continue;
            }
            token.raw.set(this.data.dictionary[record]);

            // NOTE: ignoring result
            TokenResetCommand.execute(token, parserContext, 0);
        }
        if (changes) {
            return new Change('tokens reset, positions restored, and orphaned saved positions removed');
        }
        return new Success('tokens reset and positions restored');
    }
}
