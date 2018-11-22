import { SelectedTokensSimpleCommand, Der20Token, Asynchronous, RollQuery } from 'der20/library';
import { ParserContext } from 'der20/library';
import { Result, Success } from 'der20/library';

export class StatCommand extends SelectedTokensSimpleCommand {
    handleToken(token: Der20Token, parserContext: ParserContext, tokenIndex: number): Result {
        const character = token.character;
        if (character === undefined) {
            return new Success('ignoring token that is not linked to character');
        }
        if (character.isNpc()) {
            return this.statNpc(token, parserContext, tokenIndex);
        } else {
            return this.statPc(token, parserContext);
        }
    }

    private statPc(token: Der20Token, parserContext: ParserContext): Result {
        const character = token.character;
        const result = new Success(`set up player character token for ${character.name}`);
        const hp = character.attribute('hp');
        if (hp.exists) {
            token.raw.set({ bar1_link: hp.id, bar1_value: hp.value(0), bar1_max: hp.max(0), showplayers_bar1: true });
        } else {
            token.raw.set({ showplayers_bar1: false });
            result.messages.push(`player character ${character.name} has no 'hp' attribute`);
        }
        const passiveWisdom = character.attribute('passive_wisdom');
        if (passiveWisdom.exists) {
            token.raw.set({ bar2_link: passiveWisdom.id, bar2_value: passiveWisdom.value(0), bar2_max: 30, showplayers_bar2: true });
        } else {
            token.raw.set({ showplayers_bar2: false });
            result.messages.push(`player character ${character.name} has no 'passive_wisdom' attribute`);
        }

        // default name from character, unless set on token already
        let name = character.name;
        if (token.name > '') {
            name = token.name;
        }

        // first name only
        name = name.split(/ /)[0];
        token.raw.set({
            name: name,
            showname: true,
            showplayers_name: true
        });

        return result;
    }

    private statNpc(token: Der20Token, parserContext: ParserContext, tokenIndex: number): Result {
        const character = token.character;
        let name = character.name;

        // for NPC, allow custom name that does not get over written
        if (token.name > '') {
            name = token.name;
        }

        // default to pre-rolled HP
        const maxHp: number = character.attribute('hp').max(1);
        let hp: number = maxHp;

        // initial HP calculation?
        const formula = character.attribute('npc_hpformula');
        if (formula.exists) {
            const key = `StatCommand.statNpc.hp${tokenIndex}`;
            if (parserContext.asyncVariables[key] === undefined) {
                const roll: Promise<number> = new RollQuery(formula.value('1')).asyncRoll();
                return new Asynchronous('rolling hit points for NPC', key, roll);
            } else {
                hp = parserContext.asyncVariables[key];
                token.raw.set({ bar1_link: '', bar1_value: hp, bar1_max: hp });
            }
        }

        // note passive perception
        const passiveWisdomAttribute = character.attribute('passive_wisdom');
        token.raw.set({ bar2_link: passiveWisdomAttribute.id, bar2_value: passiveWisdomAttribute.value(0), bar2_max: 30 });

        // roll initial stealth
        let stealth = 0;
        if (token.character.checkFlag('npc_stealth_flag')) {
            stealth = character.attribute('npc_stealth').value(0);
        } else {
            stealth = character.attribute('dexterity_mod').value(0);
        }
        const stealthCheck = Math.max(randomInteger(20) + stealth, 1);
        token.raw.set({ bar3_link: '', bar3_value: stealthCheck, bar3_max: 30 });

        // set up name and vision
        token.raw.set({
            name: name,
            showname: true,
            showplayers_name: true,
            showplayers_bar1: false,
            showplayers_bar2: false,
            showplayers_bar3: false,
            light_radius: '',
            light_dimradius: '',
            light_hassight: false,
            light_otherplayers: false,
            adv_fow_view_distance: ''
        });

        return new Success(`NPC ${name}, ${formula.value('1')} (${maxHp}) = ${hp}, stealth (${stealth}) = ${stealthCheck}`);
    }
}
