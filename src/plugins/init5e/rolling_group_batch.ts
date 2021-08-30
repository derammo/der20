import { ApiCommandInput, Der20Token } from 'der20/library';
import { RollingGroup } from "./rolling_group";

export class RollingGroupBatch {
    constructor(source: ApiCommandInput) {
        this.message = source.message;
    }

    /**
     * the source message that identified the selected tokens
     */
    message: ApiChatEventData;

    /**
     * accumulates all rolls, so that we can update the turn order once
     */
    sharedRolls: { group: RollingGroup; tokens: Der20Token[]; result: number; }[] = [];
}
