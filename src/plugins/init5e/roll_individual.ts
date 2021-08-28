import { SelectedTokensCommand, Der20Token, RollQuery, ParserContext, Result, Success, Sheet5eOGL, Failure } from 'der20/library';

// rolls individual initiative, ignoring grouping by creature (not according to RAW)
export class RollIndividualCommand extends SelectedTokensCommand {
    handleTokenCommand(_message: ApiChatEventData, token: Der20Token, _text: string, _parserContext: ParserContext, _tokenIndex: number): Promise<Result> {
        const character = token.character;
        if (character === undefined) {
            return new Success('ignoring token that is not linked to character').resolve();
        }

        // need async roll and restart this command
        const sheet = new Sheet5eOGL(character);
        const spec = sheet.calculateInitiativeRoll();
        if (spec === undefined) {
            return new Failure(new Error("this plugin cannot roll initiative for characters using sheets other than 5e OGL")).resolve();
        }

        // request async roll
        const roll = spec.generateRoll();
        const narrative = `${roll} (${spec.factors.join(", ")})`;
        return new RollQuery(roll).asyncRoll()
            .then((rolledNumber: number) => {
                this.setInitiative(token, rolledNumber);
                return new Success(`rolled initiative ${rolledNumber} for ${character.name} using ${narrative}`);
            });
    }

    setInitiative(token: Der20Token, rolledNumber: any) {
        // XXX this is incredibly inefficient: we should gather all the rolls together and update the JSON once
        // load current turn order
        let turnsText = Campaign().get('turnorder');
        let turns: any[];
        if (turnsText === undefined || turnsText.length < 1) {
            // this will happen in a fresh room
            turns = [];
        } else {
            turns = JSON.parse(turnsText);
        }
    
        // remove from initiative, since we re-rolled
        turns = turns.filter(function(turn) {
            return token.id !== turn.id;
        });
    
        // always add at the end, we will sort when new round starts
        turns.push({ id: token.id, pr: rolledNumber, custom: "" });
    
        // update turn order
        const newTurnsText = JSON.stringify(turns);
        Campaign().set({ turnorder: newTurnsText });

        return newTurnsText;
    }
}



