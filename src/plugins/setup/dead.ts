import { Der20Token, ParserContext, Result, SelectedTokensCommand, Success, TurnOrder } from "der20/library";

export class DeadCommand extends SelectedTokensCommand {
    handleTokenCommand(_message: ApiChatEventData, token: Der20Token, _text: string, _parserContext: ParserContext, _tokenIndex: number): Promise<Result> {
        if (token.isdrawing) {
            return new Success(`token ${token.name} is a drawing and cannot be killed`).resolve();
        }

        // set status, clearing all other status markers
        // REVISIT: if we bother implementing a wrapper for status markers, then we can use it here
        token.raw.set({ statusmarkers: 'dead' });

        // remove from init tracker
        let turns = TurnOrder.load();
        let filtered = turns.filter(function (item) {
            return item.id !== token.id;
        });
        TurnOrder.save(filtered);
        return new Success(`token ${token.name} killed and removed from initiative`).resolve();
    }
}
