import { SelectedTokensSimpleCommand, Der20Token } from 'der20/library';
import { ParserContext } from 'der20/library';
import { Result, Success } from 'der20/library';

declare var derScript: {
    stat_npc: (result: Result, token: Graphic, character_id: string) => void;
    stat_pc: (result: Result, token: Graphic, character_id: string) => void;
};

export class StatCommand extends SelectedTokensSimpleCommand {
    handleToken(token: Der20Token, parserContext: ParserContext, tokenIndex: number): Result {
        const character = token.character;
        if (character === undefined) {
            return new Success('ignoring token that is not linked to character');
        }
        if (character.isNpc()) {
            return this.statNpc(token);
        } else {
            let result = new Success('configured player character');
            derScript.stat_pc(result, token.raw, character.id);
            return result;
        }
    }

    private statNpc(npcToken: Der20Token): Result {
        let name = npcToken.character.name;
        // XXX port this to wrapper code
        const characterId = npcToken.character.id;
        const token = npcToken.raw;
        var maxhp = getAttrByName(characterId, 'hp', 'max');
        var formula = getAttrByName(characterId, 'npc_hpformula');

        // for NPC, allow custom name that does not get over written
        var tokenName = token.get('name');
        if (tokenName > '') {
            name = tokenName;
        }

        // initial HP calculation?
        if (formula) {
            var diceTerms = formula.split(/d|\+/);
            if (diceTerms.length > 1) {
                var numDice = parseInt(diceTerms[0], 10);
                var diceType = parseInt(diceTerms[1], 10);
                var mod = parseInt(diceTerms[2], 10);
                var hp = mod ? mod : 0;
                for (var i = 0; i < numDice; i++) {
                    hp = hp + randomInteger(diceType);
                }
                token.set({ bar1_link: '', bar1_value: hp, bar1_max: hp });
            }
        }

        // note passive perception
        var passiveWisdomAttribute = <Attribute>findObjs({ type: 'attribute', characterid: characterId, name: 'passive_wisdom' })[0];
        token.set({ bar2_link: passiveWisdomAttribute.id, bar2_value: passiveWisdomAttribute.get('current'), bar2_max: 30 });

        // roll initial stealth
        var stealth = 0;
        if (npcToken.character.checkFlag('npc_stealth_flag')) {
            var npcStealthAttribute = <Attribute>findObjs({ type: 'attribute', characterid: characterId, name: 'npc_stealth' })[0];
            stealth = Number(npcStealthAttribute.get('current'));
        } else {
            var dexterityModAttribute = <Attribute>findObjs({ type: 'attribute', characterid: characterId, name: 'dexterity_mod' })[0];
            stealth = Number(dexterityModAttribute.get('current'));
        }
        let stealthCheck = Math.max(randomInteger(20) + stealth, 1);
        token.set({ bar3_link: '', bar3_value: stealthCheck, bar3_max: 30 });

        // set up name and vision
        token.set({
            name: name,
            showname: true,
            showplayers_name: true,
            light_radius: '',
            light_dimradius: '',
            light_hassight: false,
            light_otherplayers: false,
            adv_fow_view_distance: ''
        });

        return new Success(`NPC ${name}, ${formula} (${maxhp}) = ${hp}, stealth (${stealth}) = ${stealthCheck}`);
    }
}
