import { D20RollSpec, Der20Character, Der20Token, Result, RollQuery, Sheet5eOGL, Success } from 'der20/library';
import { RollingGroupBatch } from './rolling_group_batch';

export enum RollingMode {
    Advantage,
    Straight,
    Disadvantage,
    Separate
}

export class RollingGroup {
    constructor(public character: Der20Character) {
        const sheet = new Sheet5eOGL(character);
        this.spec = sheet.calculateInitiativeRoll();
    }

    mode: RollingMode = RollingMode.Straight;
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
                this.mode = RollingMode.Advantage;
            } else {
                this.mode = RollingMode.Separate;
            }
        }
        else if (this.straight.length > 0) {
            if (this.advantage.length === 0 && this.disadvantage.length === 0) {
                this.mode = RollingMode.Straight;
            } else {
                this.mode = RollingMode.Separate;
            }
        }
        else if (this.disadvantage.length > 0) {
            this.mode = RollingMode.Disadvantage;
        }
    }

    roll(rollingContext: RollingGroupBatch, group: RollingGroup): Promise<Result> {
        switch (this.mode) {
            case RollingMode.Advantage: {
                return this.singleRoll(rollingContext, group, group.advantage, group.spec.generateAdvantageRoll());
            }
            case RollingMode.Disadvantage: {
                return this.singleRoll(rollingContext, group, group.disadvantage, group.spec.generateDisadvantageRoll());
            }
            case RollingMode.Straight: {
                return this.singleRoll(rollingContext, group, group.straight, group.spec.generateStraightRoll());
            }
            case RollingMode.Separate: {
                return this.mixedRoll(group, rollingContext);
            }
            default: {
                debug.log(`unsupported dice rolling mode in group roll spec: ${group.mode}`);
                throw new Error(`unsupported dice rolling mode ${group.mode}`);
            }
        }
    }

    /**
     * roll twice and service based on individual tokens' advantage/disadvantage
     * 
     * @param group 
     * @param rollingContext 
     * @returns 
     */
    private mixedRoll(group: RollingGroup, rollingContext: RollingGroupBatch): Promise<Result> {
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

    /**
     * roll a single roll which already has advantage/disadvantage baked in
     * 
     * @param rollingGroupContext
     * @param group 
     * @param tokens 
     * @param roll 
     * @returns 
     */
    private singleRoll(rollingGroupContext: RollingGroupBatch, group: RollingGroup, tokens: Der20Token[], roll: string): Promise<Result> {
        const narrative = `${roll} (${group.spec.factors.join(", ")})`;
        debug.log(narrative);
        return new RollQuery(roll).asyncRoll()
            .then((rolledNumber: number) => {
                rollingGroupContext.sharedRolls.push({ group: group, tokens: tokens, result: rolledNumber });
                return new Success(`rolled initiative ${rolledNumber} for ${group.character.name} using ${narrative}`).resolve();
            });
    }
}
