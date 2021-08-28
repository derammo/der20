import { Der20Token } from 'der20/library';
import { ParserContext } from 'der20/library';
import { Result, Change, Success } from 'der20/library';
import { PositionData } from './data';
import { ConfigurationSimpleCommand } from 'der20/library';
import { TokenResetCommand } from './reset';

export class RestoreAllCommand extends ConfigurationSimpleCommand {
    constructor(private data: PositionData) {
        super();
        // generated code
    }

    handleEndOfCommand(context: ParserContext): Promise<Result> {
        let changes = false;
        let tokens: Promise<Result>[] = [];
        for (let record of Object.keys(this.data.dictionary)) {
            let token = Der20Token.fetch(record);
            if (token === undefined) {
                // no longer exists, clean up
                delete this.data.dictionary[record];
                changes = true;
                continue;
            }
            token.raw.set(this.data.dictionary[record]);

            tokens.push(TokenResetCommand.execute(token));
        }

        // reap
        return Promise.all(tokens)
            .then((_results: Result[]) => {
                context.swapIn();
                // NOTE: ignoring reset results, this is best effort
                if (changes) {
                    return new Change('tokens reset, positions restored, and orphaned saved positions removed').resolve();
                }
                return new Success('tokens reset and positions restored').resolve();
            })
    }
}
