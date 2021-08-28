import { Der20Character } from "./character";
import { D20RollSpec } from "./d20_roll_spec";

export class Sheet5eOGL {
    constructor(private character: Der20Character) {
        // generated code
    }

    calculateInitiativeRoll(): D20RollSpec {
        /*
        initiative_style

        @{d20}
        {@{d20},@{d20}}kh1
        {@{d20},@{d20}}kl1
        */

        /*
        initiative_bonus

        NOTE: tie breaker is not RAW
        */

        /*
        dexterity_mod

        should never be needed
        */

        let spec: D20RollSpec = new D20RollSpec(0, false, false, []);

        // build raw bonus (only one factor so far)
        const initiative_bonus = this.character.attribute("initiative_bonus");
        if (initiative_bonus.exists) {
            // reject tie breaker
            // XXX configurable
            const value = Math.floor(initiative_bonus.value(0));
            spec.bonus += value;
            spec.factors.push(`init ${value >= 0 ? "+" : ""}${value}`)
        } else {
            const dexterity_mod = this.character.attribute("dexterity_mod");
            if (dexterity_mod.exists) {
                const value = dexterity_mod.value(0);
                spec.bonus += value;
                spec.factors.push(`dex ${value >= 0 ? "+" : ""}${value}`)
            } else {
                // we have no bonus at all, but let's allow that in case the 
                // character is just not populated
                debug.log(`no initiative_bonus or dexterity_mod for ${this.character.name}`)
            }                
        }

        // determine advantage/disadvantage, permissive since sheets could change
        const initiative_style = this.character.attribute("initiative_style");
        if (initiative_style.exists) {
            const roll: string = initiative_style.value("").toLowerCase();
            if (!roll.includes("@{d20}")) {
                // wrong sheet
                debug.log(`attempt to roll initiative with ${roll} denied; this plugin only supports 5e OGL characters`);
                return undefined;
            }

            if (roll.includes("kh1") || roll.includes("k1")) {
                spec.advantage = true;
                spec.factors.push("advantage on sheet");
            } else if (roll.includes("kl1")) {
                spec.disadvantage = true;
                spec.factors.push("disadvantage on sheet");
            } else {
                // basic D20 roll
            }
        } else {
            debug.log(`no initiative_style for ${this.character.name}`)
        }

        return spec;
    }
}