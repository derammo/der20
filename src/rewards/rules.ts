import { ConfigurationFloat } from "derlib/config/atoms";

export class Multiplied {
    multiplier: ConfigurationFloat;
    unit: ConfigurationFloat;
    constructor(multiplier: number, unit: number) {
        this.multiplier = new ConfigurationFloat(multiplier);
        this.unit = new ConfigurationFloat(unit);
    }

    valueFrom(base: number) {
        const roundDownTo = this.unit.value();
        return Math.floor((base * this.multiplier.value()) / roundDownTo) * roundDownTo;
    }

}

class AdvancementRules {
    downtime: Multiplied = new Multiplied(2.5, 0.5);
    renown: Multiplied = new Multiplied(0.25, 0.5);
}

export class Rules {
    advancement: AdvancementRules = new AdvancementRules();
}