import { Asynchronous, ConfigurationSimpleCommand, D20RollSpec, Der20Character, Der20Token, Failure, Multiplex, ParserContext, Result, RollQuery, Sheet5eOGL, Success, TurnOrder, TurnOrderRecord } from 'der20/library';
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
            if (this.straight.length == 0 && this.disadvantage.length == 0) {
                this.mode = Mode.Advantage;
            } else {
                this.mode = Mode.Separate;
            }
        }
        else if (this.straight.length > 0) {
            if (this.advantage.length == 0 && this.disadvantage.length == 0) {
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

class RollingBatchWrites {
    identicalGroups: { tokens: Der20Token[], rolledNumber: number }[] = [];
}

class RollingGroupMultiplex extends Multiplex<RollingGroup> {
    protected itemsDescription: string = "unique creatures";

    protected createMultiplex(message: ApiChatEventData): RollingGroup[] {
        var selectedTokens = Der20Token.selected(message).filter((item: Der20Token | undefined) => {
            return item !== undefined;
        });
        var grouped: Map<string, any> = new Map<string, any>();
        selectedTokens.forEach((token) => {
            if (token.isdrawing) {
                debug.log(`token ${token.name} is a drawing and does not get initiative`);
                return;
            }
            var character = token.character;
            if (character === undefined) {
                debug.log(`token ${token.name} is not linked to a character sheet and will not get initiative`);
                return;
            }
            var group: RollingGroup = grouped.get(character.id);
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
    
    handleEndOfCommand(context: ParserContext): Result {
        const multiplex = new RollingGroupMultiplex(context);
        return multiplex.execute(
            '', 
            (group: RollingGroup, rest: string, parserContext: ParserContext, multiplexIndex: number) => {
                return this.handleGroup(group, parserContext, multiplexIndex);
            },
            (parserContext: ParserContext) => {
                // on success, fetch batch of new initiatives
                var writes: RollingBatchWrites = parserContext.asyncVariables[RollCommand.BATCH_KEY];
                if (writes === undefined) {
                    debug.log("no batched initiative writes found in context");
                    return;
                }

                // write initiatives
                const json = this.setInitiative(writes);
                debug.log(`new initiative ${json}`);
            });
    }

    static BATCH_KEY: string = `RollCommand batch`;

    handleGroup(group: RollingGroup, parserContext: ParserContext, multiplexIndex: number): Result {
        // check for unsupported platform
        if (group.spec === undefined) {
            return new Failure(new Error("this plugin cannot roll initiative for characters using sheets other than 5e OGL"))
        }

        const number1Key = `RollCommand number 1 ${multiplexIndex}`;
        const number2Key = `RollCommand number 2 ${multiplexIndex}`;
        const narrativeKey = `RollCommand spec ${multiplexIndex}`;

        // check if we need to create the batch to accumulate all our initiative writes
        var writes: RollingBatchWrites = parserContext.asyncVariables[RollCommand.BATCH_KEY];
        if (writes === undefined) {
            writes = new RollingBatchWrites();
            parserContext.asyncVariables[RollCommand.BATCH_KEY] = writes;
        }

        // check if this execution is a continuation from an async roll 
        const rolledNumber1 = parserContext.asyncVariables[number1Key];
        const rolledNumber2 = parserContext.asyncVariables[number2Key];
        var narrative = parserContext.asyncVariables[narrativeKey];

        if (rolledNumber1 !== undefined) {
            if (rolledNumber2 === undefined) {
                // can we satisfy all tokens with this one roll?
                switch (group.mode) {
                    case Mode.Advantage: {
                        // that was an advantage roll already
                        writes.identicalGroups.push({ tokens: group.advantage, rolledNumber: rolledNumber1 });
                        return new Success(`rolled initiative ${rolledNumber1} (with advantage) for ${group.character.name} using ${narrative}`);
                    }
                    case Mode.Straight: {
                        // that was a straight roll
                        writes.identicalGroups.push({ tokens: group.straight, rolledNumber: rolledNumber1 });
                        return new Success(`rolled initiative ${rolledNumber1} for ${group.character.name} using ${narrative}`);
                    }
                    case Mode.Disadvantage: {
                        // that was a disadvantage roll already
                        writes.identicalGroups.push({ tokens: group.disadvantage, rolledNumber: rolledNumber1 });
                        return new Success(`rolled initiative ${rolledNumber1} (with disadvantage) for ${group.character.name} using ${narrative}`);
                    }
                    case Mode.Separate: {
                        // need that second roll
                        return new Asynchronous(
                            `second initiative roll for ${group.character.name} using ${narrative}`,
                            number2Key,
                            new RollQuery(group.spec.generateStraightRoll()).asyncRoll());
                    }
                }
            }

            // have both rolls; service everything from separate rolls
            writes.identicalGroups.push({ tokens: group.advantage, rolledNumber: Math.max(rolledNumber1, rolledNumber2) });
            writes.identicalGroups.push({ tokens: group.straight, rolledNumber: rolledNumber1 });
            writes.identicalGroups.push({ tokens: group.disadvantage, rolledNumber: Math.min(rolledNumber1, rolledNumber2) });
            return new Success(`rolled initiative ${rolledNumber1} (mixed advantage/disadvantage) for ${group.character.name} using ${narrative}`);
        }

        // need at least first async roll and restart this command
        switch (group.mode) {
            case Mode.Advantage:
                return this.requestRoll(parserContext, group, group.spec.generateAdvantageRoll(), number1Key, narrativeKey);
            case Mode.Straight:
            case Mode.Separate:
                return this.requestRoll(parserContext, group, group.spec.generateStraightRoll(), number1Key, narrativeKey);
            case Mode.Disadvantage:
                return this.requestRoll(parserContext, group, group.spec.generateDisadvantageRoll(), number1Key, narrativeKey);
        }
    }

    private requestRoll(parserContext: ParserContext, group: RollingGroup, roll: string, numberKey: string, narrativeKey: string): Result {
        const narrative = `${roll} (${group.spec.factors.join(", ")})`;
        parserContext.asyncVariables[narrativeKey] = narrative;
        return new Asynchronous(
            `initiative for ${group.character.name} with roll ${narrative}`,
            numberKey,
            new RollQuery(roll).asyncRoll());
    }

    private setInitiative(writes: RollingBatchWrites) {
        // load current turn order
        var turns = TurnOrder.load();

        // index to avoid n^2 comparisons
        const tokenIds: Set<String> = new Set<string>();
        writes.identicalGroups.forEach(group => group.tokens.forEach(token => tokenIds.add(token.id)));

        // remove from initiative, since we re-rolled
        turns = turns.filter(function (turn) {
            return !tokenIds.has(turn.id);
        });

        const roundMarkerName = this.autoFeatures.marker.name.value();

        var roundMarker = turns.findIndex(turn => turn.custom == roundMarkerName);
        if (roundMarker < 0 && this.autoFeatures.marker.insert.value()) {
            // make sure we have a round marker
            if (turns.length == 0) {
                // just add the turn marker
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
        }

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

    private appendNewEntries(targetArray: TurnOrderRecord[], writes: RollingBatchWrites) {
        writes.identicalGroups.forEach(identicalGroup => {
            identicalGroup.tokens.forEach(token => {
                targetArray.push({ id: token.id, pr: identicalGroup.rolledNumber, custom: "" });
            });
        });
    }
}


