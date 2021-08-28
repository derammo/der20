import { ConfigurationSimpleCommand, ParserContext, Result, Success, TurnOrder } from "der20/library";

export class SortCommand extends ConfigurationSimpleCommand {
    handleEndOfCommand(_context: ParserContext): Promise<Result> {
        let turns = TurnOrder.load();
        TurnOrder.sort(turns);
        TurnOrder.save(turns);
        return new Success("sorted initiative tracker").resolve();
    }
}