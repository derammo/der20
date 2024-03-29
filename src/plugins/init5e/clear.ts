import { ConfigurationSimpleCommand, ParserContext, Result, Success } from "der20/library";

export class ClearCommand extends ConfigurationSimpleCommand {
    handleEndOfCommand(context: ParserContext): Promise<Result> {
        Campaign().set({ turnorder: '[]', initiativepage: false });
        return new Success("cleared initiative tracker").resolve();
    }
}