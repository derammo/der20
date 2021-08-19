import { SelectedTokensSimpleCommand, Der20Token, Asynchronous, RollQuery, ParserContext, Result, Success, Sheet5eOGL, Failure } from 'der20/library';

// rolls individual initiative, ignoring grouping by creature (not according to RAW)
export class RollIndividualCommand extends SelectedTokensSimpleCommand {
    handleToken(token: Der20Token, parserContext: ParserContext, tokenIndex: number): Result {
        const character = token.character;
        if (character === undefined) {
            return new Success('ignoring token that is not linked to character');
        }

        // check if this execution is a continuation from an async roll 
        const numberKey = `RollIndividualCommand number ${tokenIndex}`;
        const specKey = `RollIndividualCommand spec ${tokenIndex}`;
        const rolledNumber = parserContext.asyncVariables[numberKey];
        if (rolledNumber !== undefined) {
            this.setInitiative(token, rolledNumber);
            return new Success(`rolled initiative ${rolledNumber} for ${character.name} using ${parserContext.asyncVariables[specKey]}`);
        }

        // need async roll and restart this command
        const sheet = new Sheet5eOGL(character);
        const spec = sheet.calculateInitiativeRoll();
        if (spec === undefined) {
            return new Failure(new Error("this plugin cannot roll initiative for characters using sheets other than 5e OGL"))
        }

        // request async roll
        const roll = spec.generateRoll();
        const narrative = `${roll} (${spec.factors.join(", ")})`;
        parserContext.asyncVariables[specKey] = narrative;
        return new Asynchronous(
            `initiative for ${character.name} with roll ${narrative}`,
            numberKey, 
            new RollQuery(roll).asyncRoll());
    }

    setInitiative(token: Der20Token, rolledNumber: any) {
        // XXX this is incredibly inefficient: we should gather all the rolls together and update the JSON once
        // load current turn order
        var turnsText = Campaign().get('turnorder');
        var turns: any[];
        if (turnsText == undefined || turnsText.length < 1) {
            // this will happen in a fresh room
            turns = [];
        } else {
            turns = JSON.parse(turnsText);
        }
    
        // remove from initiative, since we re-rolled
        turns = turns.filter(function(turn) {
            return token.id != turn.id;
        });
    
        // always add at the end, we will sort when new round starts
        turns.push({ id: token.id, pr: rolledNumber, custom: "" });
    
        // update turn order
        const newTurnsText = JSON.stringify(turns);
        Campaign().set({ turnorder: newTurnsText });

        return newTurnsText;
    }
}



