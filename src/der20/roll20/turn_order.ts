export interface TurnOrderRecord {
    id: string;
    pr: number;
    custom: string;
    formula?: string;
}

export class TurnOrder {
    static sort(newTurns: TurnOrderRecord[]) {
        newTurns.sort((left, right) => left.pr - right.pr);
    }

    static load(): TurnOrderRecord[] {
        var turnsText = Campaign().get('turnorder');
        if (turnsText == undefined || turnsText.length < 1) {
            // this will happen in a fresh room
            return [];
        } else {
            return JSON.parse(turnsText);
        }
    }

    static save(turns: TurnOrderRecord[]): string {
        const newTurnsText = JSON.stringify(turns);
        Campaign().set({ turnorder: newTurnsText });
        return newTurnsText;
    }
}