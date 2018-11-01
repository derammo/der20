export class AdventurersLeagueLog {
    // adapted from https://stackoverflow.com/questions/1714786/query-string-encoding-of-a-javascript-object
    static createRailsQueryString(obj: any, prefix: string): string {
        let text: string[] = [];
        let key: string;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                let queryVariable = prefix ? prefix + '[' + key + ']' : key;
                let value = obj[key];
                if ((value === null) || (value === undefined)) {
                    continue;
                }
                if (typeof value === 'object') {
                    // recurse
                    let contents = AdventurersLeagueLog.createRailsQueryString(value, queryVariable);
                    if (contents.length > 0) {
                        text.push(contents);
                    }
                } else {
                    text.push((encodeURIComponent(queryVariable) + '=' + encodeURIComponent(value)).replace(/%20/g, '+'));
                }
            }
        }
        return text.join('&');
    }
}

export namespace AdventurersLeagueLog {
    // these must match the actual query parameters in Rails application
    // tslint:disable:variable-name
    export class MagicItem {
        location_found: string;
        name: string;
        notes: string;
        rarity: string;
        table: string;
        table_result: number;
        tier: number;
    }

    // REVISIT: A.L.L. schema includes 'session_length_hours' that appears unused; check if this will be used so we can populate it
    export class LogEntry {
        advancement_checkpoints: number;
        adventure_title: string;
        dm_name: string;
        dm_dci_number: string;
        downtime_gained: number;
        location_played: 'Roll20';
        treasure_tier: number;
        treasure_checkpoints: number;
        notes: string;
        renown_gained: number;
        magic_items_attributes: MagicItem[];
    }
    // tslint:enable:variable-name

    // mapping from values of ddal/league_module:Rarity to A.L.L. enum
    export const Rarity: Record<string, string> = {
        Common: 'common',
        Uncommon: 'uncommon',
        Rare: 'rare',
        'Very Rare': 'very_rare',
        Legendary: 'legendary',
        Artifact: 'unique',
        Unique: 'unique'
    };
}
