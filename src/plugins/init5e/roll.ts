import { CommandInput, ConfigurationSimpleCommand, D20RollSpec, Der20Character, Der20Token, DialogResult, Failure, Multiplex, ParserContext, Result, RollQuery, Sheet5eOGL, Success, TurnOrder, TurnOrderRecord } from 'der20/library';
import { AutomaticFeaturesConfiguration } from './automatic_features_configuration';

enum Mode {
    Advantage,
    Straight,
    Disadvantage,
    Separate
}

class RollingGroup {
    constructor(public character: Der20Character) {
        const sheet = new Sheet5eOGL(character);
        this.spec = sheet.calculateInitiativeRoll();
    }

    mode: Mode = Mode.Straight;
    spec: D20RollSpec;

    // the tokens classified into sets
    // XXX this isn't right, we need to actually remember which token had what conditions that caused this
    advantage: Der20Token[] = [];
    straight: Der20Token[] = [];
    disadvantage: Der20Token[] = [];

    add(token: Der20Token): void {
        if (this.spec === undefined) {
            // unsupported platform
            return;
        }

        // classify and place into correct set
        // XXX consider poisoned, fatigued, and the base spec together
        if (this.spec.advantage && !this.spec.disadvantage) {
            this.advantage.push(token);
        } else if (this.spec.disadvantage && !this.spec.advantage) {
            this.disadvantage.push(token);
        } else {
            this.straight.push(token);
        }
    }

    // called when populated to set the roll mode
    analyze() {
        if (this.advantage.length > 0) {
            if (this.straight.length === 0 && this.disadvantage.length === 0) {
                this.mode = Mode.Advantage;
            } else {
                this.mode = Mode.Separate;
            }
        }
        else if (this.straight.length > 0) {
            if (this.advantage.length === 0 && this.disadvantage.length === 0) {
                this.mode = Mode.Straight;
            } else {
                this.mode = Mode.Separate;
            }
        }
        else if (this.disadvantage.length > 0) {
            this.mode = Mode.Disadvantage;
        }
    }
}

class RollingGroupContext {
    message: ApiChatEventData;
    sharedRolls: { group: RollingGroup, tokens: Der20Token[], result: number }[] = [];
}

class RollingGroupMultiplex extends Multiplex<RollingGroupContext, RollingGroup> {
    protected itemsDescription: string = "unique creatures";

    protected createMultiplex(rollingContext: RollingGroupContext): RollingGroup[] {
        let selectedTokens = Der20Token.selected(rollingContext.message).filter((item: Der20Token | undefined) => {
            return item !== undefined;
        });
        let grouped: Map<string, any> = new Map<string, any>();
        selectedTokens.forEach((token) => {
            if (token.isdrawing) {
                debug.log(`token ${token.name} is a drawing and does not get initiative`);
                return;
            }
            let character = token.character;
            if (character === undefined) {
                debug.log(`token ${token.name} is not linked to a character sheet and will not get initiative`);
                return;
            }
            let group: RollingGroup = grouped.get(character.id);
            if (!group) {
                group = new RollingGroup(character);
                grouped.set(character.id, group);
            }
            group.add(token);
        });
        return Array.from(grouped.values()).map((group: RollingGroup) => {
            group.analyze();
            return group;
        });
    }
}

export class RollCommand extends ConfigurationSimpleCommand {
    constructor(private autoFeatures: AutomaticFeaturesConfiguration) {
        super();
    }
    
    handleEndOfCommand(context: ParserContext): Promise<Result> {
        const multiplex = new RollingGroupMultiplex(context);
        return multiplex.execute(
            '',
            new RollingGroupContext(), 
            (writes: RollingGroupContext, group: RollingGroup, _text: string, parserContext: ParserContext, multiplexIndex: number) => {
                return this.handleGroup(writes, group, parserContext, multiplexIndex);
            },
            (rollingContext: RollingGroupContext, parserContext: ParserContext) => {
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

    createDialog(parserContext: ParserContext, rollingContext: RollingGroupContext): string {
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

    handleGroup(rollingContext: RollingGroupContext, group: RollingGroup, _parserContext: ParserContext, _multiplexIndex: number): Promise<Result> {
        // check for unsupported platform
        if (group.spec === undefined) {
            return new Failure(new Error("this plugin cannot roll initiative for characters using sheets other than 5e OGL")).resolve();
        }

        // roll dice
        switch (group.mode) {
            case Mode.Advantage: {
                return this.singleRoll(group.spec.generateAdvantageRoll(), group, rollingContext);
            }
            case Mode.Disadvantage: {
                return this.singleRoll(group.spec.generateDisadvantageRoll(), group, rollingContext);
            }
            case Mode.Straight: {
                return this.singleRoll(group.spec.generateStraightRoll(), group, rollingContext);
            }
            case Mode.Separate: {
                // roll twice and service based on individual tokens' advantage/disadvantage
                const roll = group.spec.generateStraightRoll();
                const narrative = `${roll} (${group.spec.factors.join(", ")})`;

                return Promise.all([new RollQuery(roll).asyncRoll(), new RollQuery(roll).asyncRoll()])
                    .then((rolledNumbers: number[]) => {
                        // have both rolls; service everything from separate rolls
                        rollingContext.sharedRolls.push({ group: group, tokens: group.advantage, result: Math.max(rolledNumbers[0], rolledNumbers[1]) });
                        rollingContext.sharedRolls.push({ group: group, tokens: group.straight, result: rolledNumbers[0] });
                        rollingContext.sharedRolls.push({ group: group, tokens: group.disadvantage, result: Math.min(rolledNumbers[0], rolledNumbers[1]) });
                        return new Success(`rolled initiative ${rolledNumbers[0]},${rolledNumbers[1]} (mixed advantage/disadvantage) for ${group.character.name} using ${narrative}`).resolve();
                    });
            }
            default: throw new Error(`unsupported dice rolling mode ${group.mode}`);
        }
    }

    private singleRoll(roll: string, group: RollingGroup, writes: RollingGroupContext): Promise<Result> {
        const narrative = `${roll} (${group.spec.factors.join(", ")})`;
        return new RollQuery(roll).asyncRoll()
            .then((rolledNumber: number) => {
                writes.sharedRolls.push({ group: group, tokens: group.advantage, result: rolledNumber });
                return new Success(`rolled initiative ${rolledNumber} (with advantage) for ${group.character.name} using ${narrative}`);
            });
    }

    private setInitiative(writes: RollingGroupContext) {
        // load current turn order
        let turns = TurnOrder.load();

        // index to avoid n^2 comparisons
        const tokenIds: Set<String> = new Set<string>();
        writes.sharedRolls.forEach(group => group.tokens.forEach(token => tokenIds.add(token.id)));

        // remove from initiative, since we re-rolled
        turns = turns.filter(function (turn) {
            return !tokenIds.has(turn.id);
        });

        let roundMarker = this.findOrCreateRoundMarker(turns);

        if (roundMarker > 0 || !this.autoFeatures.sort.value()) {
            // we are in the middle of a round or we aren't allowed to automatically sort, so add at the end
            const newTurns: TurnOrderRecord[] = [];
            this.appendNewEntries(newTurns, writes);
            TurnOrder.sort(newTurns);
            turns = turns.concat(newTurns);
        } else {
            // we are at the top of a round, so we can sort the next items in now
            this.appendNewEntries(turns, writes)
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
            const max = turns.reduce((indexOfMinValue, turn, currentIndex) => {
                if (turn.pr > turns[indexOfMinValue].pr) {
                    return currentIndex;
                } else {
                    return indexOfMinValue;
                }
            },
                0);
            turns.splice(max, 0, { id: "-1", pr: 101, custom: roundMarkerName, formula: "+1" });
            roundMarker = max;
        }

        return roundMarker;
    }

    private appendNewEntries(targetArray: TurnOrderRecord[], writes: RollingGroupContext) {
        writes.sharedRolls.forEach(identicalGroup => {
            identicalGroup.tokens.forEach(token => {
                targetArray.push({ id: token.id, pr: identicalGroup.result, custom: "" });
            });
        });
    }
}

