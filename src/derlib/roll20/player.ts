export class Der20Player {
    constructor(private player: Player) {
        // generated code
    }

    static online(): Der20Player[] {
        let objects = findObjs({ _type: 'player', _online: true });
        let result = [];
        for (let object of objects) {
            if (object === undefined) {
                continue;
            }
            result.push(new Der20Player(<Player>object));
        }
        return result;
    }

    get id(): string {
        return this.player.get('_id');
    }
    
    get name(): string {
        return this.player.get('_displayname');
    }
    
    get raw(): Player {
        return this.player;
    }
    
    get userid(): string {
        return this.player.get('_d20userid');
    }
}