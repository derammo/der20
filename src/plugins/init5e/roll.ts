import { ApiCommandInput, CommandInput, ConfigurationSimpleCommand, DialogResult, Failure, ParserContext, Result, Success, TurnOrder, TurnOrderRecord } from 'der20/library';
import { AutomaticFeaturesConfiguration } from './automatic_features_configuration';
import { RollingGroupMultiplex } from './rolling_group_multiplex';
import { RollingGroup } from './rolling_group';
import { RollingGroupBatch } from './rolling_group_batch';

export class RollCommand extends ConfigurationSimpleCommand {
    constructor(private autoFeatures: AutomaticFeaturesConfiguration) {
        super();
    }

    handleEndOfCommand(context: ParserContext): Promise<Result> {
        if (context.input.kind !== CommandInput.Kind.api) {
            return new Failure(new Error('dice rolling for selected tokens requires an API input source')).resolve();
        }
        const source = <ApiCommandInput>(context.input);
        const multiplex = new RollingGroupMultiplex(context);
        return multiplex.execute(
            '',
            new RollingGroupBatch(source),
            (writes: RollingGroupBatch, group: RollingGroup, _text: string, parserContext: ParserContext, multiplexIndex: number) => {
                return this.handleGroup(writes, group, parserContext, multiplexIndex);
            },
            (rollingContext: RollingGroupBatch, parserContext: ParserContext) => {
                // write initiatives
                const json = this.setInitiative(rollingContext);
                debug.log(`new initiative ${json}`);

                if (parserContext.input.kind === CommandInput.Kind.api) {
                    // return a dialog showing who got what and why
                    return new DialogResult(DialogResult.Destination.caller, this.createDialog(parserContext, rollingContext)).resolve();
                }
                return new Success("rolled initiative for all selected tokens").resolve();
            });
    }

    createDialog(parserContext: ParserContext, rollingContext: RollingGroupBatch): string {
        let dialog = new parserContext.dialog();
        let rolls = Array.from(rollingContext.sharedRolls);
        rolls.sort((left, right) => right.result - left.result);
        for (let item of rolls) {
            dialog.beginControlGroup();
            dialog.addLinkTextLine(`${item.group.character.name} = ${item.result}`, item.group.character.href);
            // XXX concatenate each unique set of unique factors from the per-token factors
            dialog.addIndentedTextLine(item.group.spec.factors.join(", "));
            dialog.endControlGroup();
        }
        return dialog.render();
    }

    handleGroup(rollingContext: RollingGroupBatch, group: RollingGroup, _parserContext: ParserContext, _multiplexIndex: number): Promise<Result> {
        // check for unsupported platform
        if (group.spec === undefined) {
            debug.log("no group spec found");
            return new Failure(new Error("this plugin cannot roll initiative for characters using sheets other than 5e OGL")).resolve();
        }

        // roll dice
        return group.roll(rollingContext, group);
    }

    private setInitiative(rollingContext: RollingGroupBatch) {
        // load current turn order
        let turns = TurnOrder.load();

        // index to avoid n^2 comparisons
        const tokenIds: Set<String> = new Set<string>();
        rollingContext.sharedRolls.forEach(group => group.tokens.forEach(token => tokenIds.add(token.id)));

        // remove from initiative, since we re-rolled
        turns = turns.filter(function (turn) {
            return !tokenIds.has(turn.id);
        });

        let roundMarker = this.findOrCreateRoundMarker(turns);

        if (roundMarker > 0 || !this.autoFeatures.sort.value()) {
            // we are in the middle of a round or we aren't allowed to automatically sort, so add at the end
            const newTurns: TurnOrderRecord[] = [];
            this.appendNewEntries(newTurns, rollingContext);
            TurnOrder.sort(newTurns);
            turns = turns.concat(newTurns);
        } else {
            // we are at the top of a round, so we can sort the next items in now
            this.appendNewEntries(turns, rollingContext)
            TurnOrder.sort(turns);
        }

        // update turn order
        return TurnOrder.save(turns);
    }

    private findOrCreateRoundMarker(turns: TurnOrderRecord[]) {
        const roundMarkerName = this.autoFeatures.marker.name.value();

        let roundMarker = turns.findIndex(turn => turn.custom === roundMarkerName);
        if (roundMarker >= 0 || !this.autoFeatures.marker.insert.value()) {
            // exists or we are not allowed to create it
            return roundMarker;
        }

        if (turns.length === 0) {
            // empty initiative, just add the turn marker
            turns.push({ id: "-1", pr: 101, custom: roundMarkerName, formula: "+1" });
            roundMarker = 0;
        } else {
            // insert it before the maximum value (first occurrence)
            const max = turns.reduce(this.minPriority, 0);
            turns.splice(max, 0, { id: "-1", pr: 101, custom: roundMarkerName, formula: "+1" });
            roundMarker = max;
        }

        return roundMarker;
    }

    private minPriority(previousValue: number, currentValue: TurnOrderRecord, currentIndex: number, array: TurnOrderRecord[]): number {
        if (currentValue.pr > array[previousValue].pr) {
            return currentIndex;
        } else {
            return previousValue;
        }
    }

    private appendNewEntries(targetArray: TurnOrderRecord[], rollingContext: RollingGroupBatch) {
        rollingContext.sharedRolls.forEach(identicalGroup => {
            identicalGroup.tokens.forEach(token => {
                targetArray.push({ id: token.id, pr: identicalGroup.result, custom: "" });
            });
        });
    }
}

