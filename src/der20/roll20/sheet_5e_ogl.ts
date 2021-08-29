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
        const initiativeBonus = this.character.attribute("initiative_bonus");
        if (initiativeBonus.exists) {
            // reject tie breaker
            // XXX configurable
            const value = Math.floor(initiativeBonus.value(0));
            spec.bonus += value;
            spec.factors.push(`init ${value >= 0 ? "+" : ""}${value}`)
        } else {
            const dexterityMod = this.character.attribute("dexterity_mod");
            if (dexterityMod.exists) {
                const value = dexterityMod.value(0);
                spec.bonus += value;
                spec.factors.push(`dex ${value >= 0 ? "+" : ""}${value}`)
            } else {
                // we have no bonus at all, but let's allow that in case the 
                // character is just not populated
                debug.log(`no initiative_bonus or dexterity_mod for ${this.character.name}`)
            }                
        }

        // determine advantage/disadvantage, permissive since sheets could change
        const initiativeStyle = this.character.attribute("initiative_style");
        if (initiativeStyle.exists) {
            const roll: string = initiativeStyle.value("").toLowerCase();
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