import { ConfigurationSimpleCommand, Der20Character, Der20Token, ParserContext, Result, Success, TurnOrder } from 'der20/library';
import { AutomaticFeaturesConfiguration } from './automatic_features_configuration';

export class NewTurnCommand extends ConfigurationSimpleCommand {
    constructor(private autoFeatures: AutomaticFeaturesConfiguration) {
        super();
    }

    handleEndOfCommand(context: ParserContext): Result {
        var turns = TurnOrder.load();
        if (turns.length == 0) {
            return new Success("empty initiative tracker");
        }

        if (turns[0].custom == this.autoFeatures.marker.name.value()) {
            // round tracker recognized
            const counter = Number(turns[0].pr);
            sendChat('init5e', `/w GM ${this.autoFeatures.marker.name.value()} ${counter > 100 ? counter - 100 : counter}`, null, { noarchive: true });

            if (!this.autoFeatures.sort.value()) {
                return new Success("automatic initiative sorting on new round is disabled");
            }
            if (TurnOrder.isSorted(turns)) {
                return new Success("initiative is already sorted");
            }
            TurnOrder.sort(turns);
            const json = TurnOrder.save(turns);
            debug.log(`auto sorted initiative: ${json}`)
            return new Success("automatically sorted initiative on new round");
        }

        if (!this.autoFeatures.actions.value()) {
            return new Success("action announcements are disabled");
        }

        var token = Der20Token.fetch(turns[0].id);
        if (!token) {
            return new Success("no active token in initiative");
        }

        var character = token.character;
        if (character === undefined) {
            return new Success("no character associated with active token in initiative");
        }

        this.sendLinks(character);
        return new Success("action announcements displayed");
    }

    private sendLinks(character: Der20Character) {
        var text = [];
        const regex = new RegExp(`^repeating_npcaction_(-[-A-Za-z0-9]+?|\\d+)_name`);

        text.push(`next turn is for [${character.name}](${character.href})`);
        findObjs({ type: 'attribute', characterid: character.id }).forEach(raw => {
            var attribute: Attribute = raw as Attribute;
            var attribute_name = attribute.get('name');
            if (attribute_name.search(regex) === 0) {
                text.push(`[${attribute.get('current')}](~${character.id}|${attribute_name.slice(0, -5)}_npc_action)`);
            }
        });
        if (text.length > 0) {
            sendChat('init5e', `/w GM ${text.join(' ')}`, null, { noarchive: true });
        }
    }
}
