export class RollQuery {
    constructor(public formula: string) {
        // generated code
    }

    asyncRoll(): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            sendChat('RollQuery', `/roll ${this.formula}`, (messages: ChatEventData[]) => {
                if (messages.length > 1) {
                    throw new Error(`unexpected number (${messages.length}) of messages received in response to roll query`);
                } 
                debug.log(`${messages[0].type} ${messages[0].content}`);
                const rolls: RollSummary = JSON.parse(messages[0].content) as RollSummary;
                resolve(rolls.total);
            })
        });
    }

    asyncVerboseRoll(): Promise<RollSummary> {
        return new Promise<RollSummary>((resolve, reject) => {
            sendChat('RollQuery', `/roll ${this.formula}`, (messages: ChatEventData[]) => {
                if (messages.length > 1) {
                    throw new Error(`unexpected number (${messages.length}) of messages received in response to roll query`);
                } 
                resolve(JSON.parse(messages[0].content) as RollSummary);
            })
        });
    }
}