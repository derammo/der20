import { Der20Token, ParserContext, Result, SelectedTokensSimpleCommand, Success, TurnOrder } from "der20/library";

export class DeadCommand extends SelectedTokensSimpleCommand {
    handleToken(token: Der20Token, _parserContext: ParserContext, _tokenIndex: number): Result {
        if (token.isdrawing) {
            return new Success(`token ${token.name} is a drawing and cannot be killed`);
        }

        // set status, clearing all other status markers
        // REVISIT: if we bother implementing a wrapper for status markers, then we can use it here
        token.raw.set({ statusmarkers: 'dead' });

        // remove from init tracker
        var turns = TurnOrder.load();
        var filtered = turns.filter(function (item) {
            return item.id != token.id;
        });
        TurnOrder.save(filtered);
        return new Success(`token ${token.name} killed and removed from initiative`);
    }
}
