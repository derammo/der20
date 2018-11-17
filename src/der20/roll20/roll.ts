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
                const content = JSON.parse(messages[0].content);
                resolve(content.total);
            })
        });
    }
}