import { CommandInput } from "der20/interfaces/config";
import { LoaderContext } from "der20/interfaces/loader";
import { CommandSink, CommandSource } from "der20/interfaces/source";

export interface TurnOrderRecord {
    id: string;
    pr: number;
    custom: string;
    formula?: string;
}

export class TurnOrder {
    // check if sort would leave order unchanged
    static isSorted(turns: TurnOrderRecord[]) {
        return turns.reduce((running: { sorted: Boolean, previous: TurnOrderRecord }, current: TurnOrderRecord) => {
            if ((running.previous !== undefined) && ((current.pr - running.previous.pr) > 0)) {
                return { sorted: false, previous: current };
            }
            return { sorted: running.sorted, previous: current };
        }, { sorted: true, previous: undefined }).sorted;
    }

    // sort in place
    static sort(newTurns: TurnOrderRecord[]) {
        newTurns.sort((left, right) => right.pr - left.pr);
    }

    static load(): TurnOrderRecord[] {
        let turnsText = Campaign().get('turnorder');
        if (turnsText === undefined || turnsText.length < 1) {
            // this will happen in a fresh room
            return [];
        } else {
            return JSON.parse(turnsText);
        }
    }

    // WARNING: this is asynchronous/delayed?
    static save(turns: TurnOrderRecord[]): string {
        const newTurnsText = JSON.stringify(turns);
        Campaign().set({ turnorder: newTurnsText });
        return newTurnsText;
    }
}

export class TurnOrderAnnouncer implements CommandSource, CommandInput {
    constructor(options: any, private sink: CommandSink) {
        // generated code
    }

    kind: CommandInput.Kind = CommandInput.Kind.restore;

    authorize(rest: string): boolean {
        return true;
    }

    private firstId: RegExp = /["']id["'] *: *["']([^"']+)["']/;

    restore(_context: LoaderContext): Promise<void> {
        on('change:campaign:turnorder', (campaign, previous) => {
            try {
                this.sink.swapIn();

                // ignore any change that does not change whose turn it is
                // NOTE: let's not parse it just to check one attribute so we just regex out the first id
                const previousFirst = this.firstId.exec(previous.turnorder);
                const first = this.firstId.exec(campaign.get('turnorder'))

                if (first == null && previousFirst == null) {
                    debug.log("ignoring change from empty initiative tracker to empty initiative tracker");
                    return;
                }

                if (first != null && 
                    previousFirst != null &&
                    first[1] === previousFirst[1]) {
                    debug.log("ignoring change to initiative tracker because it did not change who is next");
                    return;
                }

                // XXX design flaw: how can a source be configured for a particular plugin? we need to know what to send
                this.sink.dispatchCommands(this, "!init5e actions announce");
                return;
            } catch (error) {
                this.sink.handleErrorThrown(error);
            }
        });
        return Promise.resolve();
    }

    query(_context: LoaderContext, _opaque: any): Promise<void> {
        // no code
        return Promise.resolve();
    }
}
