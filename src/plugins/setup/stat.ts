import { CommandInput, ConfigurationEnumerated, ConfigurationInteger, data, Der20Token, DialogResult, Failure, ParserContext, Result, RollQuery, SelectedTokensCommand, Success, Tokenizer } from 'der20/library';
import { DarkvisionCommand } from './darkvision';
import { LightCommand } from './light';

export class StatCommand extends SelectedTokensCommand {
    @data
    knownCharacters: Map<string, boolean> = new Map<string, boolean>();

    constructor(private hpRollingOption: ConfigurationEnumerated) {
        super();
    }

    handleTokenCommand(_message: ApiChatEventData, token: Der20Token, _text: string, parserContext: ParserContext, tokenIndex: number): Promise<Result> {
        const character = token.character;
        if (character === undefined) {
            return new Success('ignoring token that is not linked to character').resolve();
        }
        if (character.isNpc()) {
            return this.statNpc(token, parserContext, tokenIndex);
        } else {
            return this.statPc(token, parserContext).resolve();
        }
    }

    /* eslint-disable @typescript-eslint/naming-convention */
    private statPc(token: Der20Token, parserContext: ParserContext): Result {
        const character = token.character;
        let needsHp: boolean = false;
        let needsPp: boolean = false;
        let needsAc: boolean = false;

        // we could have a default char sheet and still get numbers here (all 10s) so we really need to check
        // if we previously ingested this character, so we can second guess any 10s 
        const knownCharacter: boolean = this.knownCharacters.get(character.id) ?? false;

        const hp = character.attribute('hp');
        if (hp.value(0) > 0) {
            token.raw.set({ bar1_link: hp.id, bar1_value: hp.value(0), bar1_max: hp.max(0) });
        } else {
            token.raw.set({ bar1_link: "", bar1_value: 0, bar1_max: 0 });
            needsHp = true;
        }
        
        const passiveWisdom = character.attribute('passive_wisdom');
        const passiveWisdomValue = passiveWisdom.value(0);
        if (passiveWisdomValue > 0  && (passiveWisdomValue !== 10 || knownCharacter)) {
            token.raw.set({ bar2_link: passiveWisdom.id, bar2_value: passiveWisdomValue, bar2_max: "30 (PP)" });
        } else {
            token.raw.set({ bar2_link: "", bar2_value: 0, bar2_max: 30 });
            needsPp = true;
        }

        const armorClass = character.attribute('ac');
        const armorClassValue = armorClass.value(0);
        if (armorClassValue > 0 && (armorClassValue !== 10 || knownCharacter)) {
            token.raw.set({ bar3_link: armorClass.id, bar3_value: armorClassValue, bar3_max: "30 (AC)" });
        } else {
            token.raw.set({ bar3_link: "", bar3_value: 0, bar3_max: 30 });
            needsAc = true;
        }

        // default name from character, unless set on token already
        let name = character.name;
        if (token.name > '') {
            name = token.name;
        }

        // first name only
        name = Tokenizer.tokenize(name)[0];

        // set up token for player
        token.raw.set({
            name: name,
            showname: true,
            showplayers_name: true,
            showplayers_bar1: false,
            showplayers_bar2: false,
            showplayers_bar3: false,
            playersedit_bar1: false,
            playersedit_bar2: false,
            playersedit_bar3: false,
            bar_location: "overlap_bottom",
            compact_bar: null
        });

        // note we have seen this character now
        this.knownCharacters.set(character.id, true);

        // set sane defaults
        LightCommand.setDefaultsNoLight(token);
        DarkvisionCommand.setDefaultsNoDarkvision(token);

        if (parserContext.input.kind === CommandInput.Kind.api && (needsHp || needsPp || needsAc)) {
            // interactive mode
            let dialog = new parserContext.dialog();
            const link = {
                command: parserContext.command,
                prefix: `character ${character.id}`
            };
            dialog.addTitle(`Complete missing info for: ${character.name}`);
            dialog.beginControlGroup();
            if (needsHp) {
                dialog.addEditControl("Hit Points", "hp", new ConfigurationInteger(0), link);
            }
            if (needsAc) {
                dialog.addEditControl("Armor Class", "ac", new ConfigurationInteger(armorClassValue), link);
            }
            if (needsPp) {
                dialog.addEditControl("Passive Perception", "pp", new ConfigurationInteger(passiveWisdomValue), link);
            }
            dialog.endControlGroup();
            return new DialogResult(DialogResult.Destination.caller, dialog.render());
        } else {
            const result = new Success(`set up player character token for ${character.name}`);
            if (needsHp) {
                result.messages.push(`player character ${character.name} has no 'hp' attribute`);
            }
            if (needsAc) {
                result.messages.push(`player character ${character.name} has no 'ac' attribute`);
            }
            if (needsPp) {
                result.messages.push(`player character ${character.name} has no 'passive_wisdom' attribute`);
            }
            return result;
        }
    }

    private statNpc(token: Der20Token, _parserContext: ParserContext, _tokenIndex: number): Promise<Result> {
        const character = token.character;
        let name = character.name;

        // for NPC, allow custom name that does not get over written
        if (token.name > '') {
            name = token.name;
        }

        // note passive perception
        const passiveWisdomAttribute = character.attribute('passive_wisdom');
        token.raw.set({ bar2_link: passiveWisdomAttribute.id, bar2_value: passiveWisdomAttribute.value(0), bar2_max: "30 (PP)" });

        // roll initial stealth
        let stealth = 0;
        if (token.character.checkFlag('npc_stealth_flag')) {
            stealth = character.attribute('npc_stealth').value(0);
        } else {
            stealth = character.attribute('dexterity_mod').value(0);
        }
        const stealthCheck = Math.max(randomInteger(20) + stealth, 1);
        token.raw.set({ bar3_link: '', bar3_value: stealthCheck, bar3_max: "30 (S)" });

        // set up name and vision
        token.raw.set({
            name: name,
            showname: true,
            showplayers_name: true,
            showplayers_bar1: false,
            showplayers_bar2: false,
            showplayers_bar3: false,
            playersedit_bar1: false,
            playersedit_bar2: false,
            playersedit_bar3: false,
            bar_location: "overlap_bottom",
            compact_bar: null
        });

        // default to pre-rolled HP
        const averageHp: number = character.attribute('hp').max(1);
        let hp: number = averageHp;

        // initial HP calculation?
        const formula = character.attribute('npc_hpformula');
        if (formula.exists) {
            return new RollQuery(formula.value('1'))
                .asyncVerboseRoll()
                .then((value: RollSummary) => {
                    hp = this.processRoll(value, token);
                    return new Success(`NPC ${name}, ${formula.value('1')} (${averageHp}) = ${this.hpRollingOption.value()} ${hp}, stealth (${stealth}) = ${stealthCheck}`);
                }, (reason: any) => {
                    return new Failure(new Error(reason));
                });
        }
                
        return new Success(`NPC ${name}, ${formula.value('1')} (${averageHp}) = average ${hp}, stealth (${stealth}) = ${stealthCheck}`).resolve();
    }

    private processRoll(summary: RollSummary, token: Der20Token) {
        let hp = 0;
        switch (this.hpRollingOption.value()) {
            case "maximized": {
                if (summary.resultType !== "sum") {
                    throw new Error(`unsupported result type ${summary.resultType} in hit points formula; cannot maximize hp`);
                }
                summary.rolls.forEach(roll => {
                    switch (roll.type) {
                        case "V":
                            throw new Error("unsupported type V roll in hit points formula; cannot maximize hp");
                        case "G":
                            throw new Error("unsupported type G roll in hit points formula; cannot maximize hp");
                        case "M":
                            hp += Number((roll as MathExpression).expr);
                            break;
                        case "R": {
                            const basicRoll: BasicRoll = roll as BasicRoll;
                            hp += basicRoll.dice * basicRoll.sides;
                            break;
                        }
                        case "C":
                            throw new Error("unsupported type G roll in hit points formula; cannot maximize hp");
                        default:
                            throw new Error(`unsupported roll type ${roll.type} in hit points formula; cannot maximize hp`);
                    }
                });
                break;
            }
            case "rolled":
            default:
                hp = summary.total;
                break;
        }
        token.raw.set({ bar1_link: '', bar1_value: hp, bar1_max: hp });
        return hp;
    }

    /* eslint-enable @typescript-eslint/naming-convention */
}
