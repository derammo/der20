import { Der20Character } from "./character";
import { D20RollSpec } from "./d20_roll_spec";

export class Sheet5eOGL {
    constructor(private character: Der20Character) {
        // generated code
    }

    calculateInitiativeRoll(): D20RollSpec {
        this.character.attribute("init_bonus");
        return new D20RollSpec(3, true, false, ["dex +3"]);
    }
}