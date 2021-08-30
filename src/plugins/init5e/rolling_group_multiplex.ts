import { Der20Token, Multiplex } from 'der20/library';
import { RollingGroup } from './rolling_group';
import { RollingGroupBatch } from './rolling_group_batch';

export class RollingGroupMultiplex extends Multiplex<RollingGroupBatch, RollingGroup> {
    protected itemsDescription: string = "unique creatures";

    protected createMultiplex(rollingContext: RollingGroupBatch): RollingGroup[] {
        let selectedTokens = Der20Token.selected(rollingContext.message).filter((item: Der20Token | undefined) => {
            return item !== undefined;
        });
        debug.log(`sorting ${selectedTokens.length} selected tokens for group rolling`);
        let grouped: Map<string, RollingGroup> = new Map<string, RollingGroup>();
        selectedTokens.forEach((token) => {
            if (token.isdrawing) {
                debug.log(`token ${token.name} is a drawing and does not get initiative`);
                return;
            }
            let character = token.character;
            if (character === undefined) {
                debug.log(`token ${token.name} is not linked to a character sheet and will not get initiative`);
                return;
            }
            let group: RollingGroup = grouped.get(character.id);
            if (!group) {
                group = new RollingGroup(character);
                grouped.set(character.id, group);
            }
            group.add(token);
        });
        return Array.from(grouped.values()).map((group: RollingGroup) => {
            group.analyze();
            return group;
        });
    }
}
