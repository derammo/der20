import { ConfigurationFloat } from "derlib/config/atoms";
import { ConfigurationIntermediateNode } from "derlib/config/intermediate";

export class Multiplied extends ConfigurationIntermediateNode {
    multiplier: ConfigurationFloat;
    unit: ConfigurationFloat;
    constructor(multiplier: number, unit: number) {
        super();
        this.multiplier = new ConfigurationFloat(multiplier);
        this.unit = new ConfigurationFloat(unit);
    }

    valueFrom(base: number) {
        const roundDownTo = this.unit.value();
        return Math.floor((base * this.multiplier.value()) / roundDownTo) * roundDownTo;
    }

}

class AdvancementRules extends ConfigurationIntermediateNode {
    downtime: Multiplied = new Multiplied(2.5, 0.5);
    renown: Multiplied = new Multiplied(0.25, 0.5);
}

export class Rules extends ConfigurationIntermediateNode {
    advancement: AdvancementRules = new AdvancementRules();
}