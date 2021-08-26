import { config, ConfigurationFloat, ConfigurationIntermediateNode } from "der20/library";

export class Multiplied extends ConfigurationIntermediateNode {
    @config multiplier: ConfigurationFloat;
    @config unit: ConfigurationFloat;

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
    @config downtime: Multiplied = new Multiplied(2.5, 0.5);
    @config renown: Multiplied = new Multiplied(0.25, 0.5);
}

export class Rules extends ConfigurationIntermediateNode {
    @config advancement: AdvancementRules = new AdvancementRules();
}