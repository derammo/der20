import { ConfigurationSimpleCommand, Der20Character, Der20Token, ParserContext, Result, Success, TurnOrder } from 'der20/library';
import { AutomaticFeaturesConfiguration } from './automatic_features_configuration';

export class NewTurnCommand extends ConfigurationSimpleCommand {
    constructor(private autoFeatures: AutomaticFeaturesConfiguration) {
        super();
    }

    handleEndOfCommand(context: ParserContext): Promise<Result> {
        let turns = TurnOrder.load();
        if (turns.length === 0) {
            return new Success("empty initiative tracker").resolve();
        }

        if (turns[0].custom === this.autoFeatures.marker.name.value()) {
            // round tracker recognized
            const counter = Number(turns[0].pr);
            sendChat('init5e', `/w GM ${this.autoFeatures.marker.name.value()} ${counter > 100 ? counter - 100 : counter}`, null, { noarchive: true });

            if (!this.autoFeatures.sort.value()) {
                return new Success("automatic initiative sorting on new round is disabled").resolve();
            }
            if (TurnOrder.isSorted(turns)) {
                return new Success("initiative is already sorted").resolve();
            }
            TurnOrder.sort(turns);
            const json = TurnOrder.save(turns);
            debug.log(`auto sorted initiative: ${json}`)
            return new Success("automatically sorted initiative on new round").resolve();
        }

        if (!this.autoFeatures.actions.value()) {
            return new Success("action announcements are disabled").resolve();
        }

        let token = Der20Token.fetch(turns[0].id);
        if (!token) {
            return new Success("no active token in initiative").resolve();
        }

        let character = token.character;
        if (character === undefined) {
            return new Success("no character associated with active token in initiative").resolve();
        }

        this.sendLinks(character);
        return new Success("action announcements displayed").resolve();
    }

    private sendLinks(character: Der20Character) {
        let text = [];
        const regex = new RegExp(`^repeating_npcaction_(-[-A-Za-z0-9]+?|\\d+)_name`);

        text.push(`next turn is for [${character.name}](${character.href})`);
        findObjs({ type: 'attribute', characterid: character.id }).forEach(raw => {
            let attribute: Attribute = raw as Attribute;
            let attributeName = attribute.get('name');
            if (attributeName.search(regex) === 0) {
                text.push(`[${attribute.get('current')}](~${character.id}|${attributeName.slice(0, -5)}_npc_action)`);
            }
        });
        if (text.length > 0) {
            sendChat('init5e', `/w GM ${text.join(' ')}`, null, { noarchive: true });
        }
    }
}
