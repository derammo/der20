export class D20RollSpec {
    bonus: number;
    advantage: boolean;
    disadvantage: boolean;
    factors: string[];

    constructor(bonus: number, advantage: boolean, disadvantage: boolean, factors: string[]) {
        this.bonus = bonus;
        this.advantage = advantage;
        this.disadvantage = disadvantage;
        this.factors = factors;
    }

    get bonusSign(): string {
        return this.bonus >= 0 ? "+" : "";
    }

    generateRoll(): string {
        if (this.advantage && !this.disadvantage) {
            return this.generateAdvantageRoll();
        }
        if (this.disadvantage && !this.advantage) {
            return this.generateDisadvantageRoll();
        }
        return this.generateStraightRoll();
    }

    generateAdvantageRoll(): string {
        return `2d20k1${this.bonusSign}${this.bonus}`;
    }

    generateDisadvantageRoll(): string {
        return `2d20kl1${this.bonusSign}${this.bonus}`;
    }

    generateStraightRoll(): string {
        return `1d20${this.bonusSign}${this.bonus}`;
    }
}
