import { ConfigurationBoolean, ConfigurationValueBase, Der20Character, Der20Player, ExportContext, Failure, ParserContext, Result, Tokenizer } from "der20/library";

class PlayerCharacter {
    // REVISIT: is it a problem that we hold references to these characters and players?  what happens if they are deleted in the GUI?
    constructor(public player: Der20Player, public character: Der20Character, public selected: ConfigurationBoolean) {
        // generated code
    }
}

export class PlayerCharacters extends ConfigurationValueBase<PlayerCharacter[]> {
    characters: PlayerCharacter[] = [];

    constructor() {
        super([], 'USER_ID character CHARACTER_ID selected TRUE/FALSE/BLANK');
    }
    
    scan(): void {
        if (typeof findObjs !== 'function') {
            // this will happen during testing
            return;
        }
        this.clear();
        let players = Der20Player.online();
        let all = Der20Character.owned();
        for (let player of players) {
            let owned = all.filter(character => {
                return character.controlledby.some(owner => {
                    return owner === player.id;
                });
            });
            if (owned.length < 1) {
                console.log(`player ${player.name} does not control any characters`);
                continue;
            }
            debug.log(`player ${player.name} controls ${owned.length} characters`);
            let highest = 0;
            let highestIndex = 0;
            let characters = [];
            for (let i = 0; i < owned.length; i++) {
                characters.push(new PlayerCharacter(player, owned[i], new ConfigurationBoolean(false)));
                let level = owned[i].attribute('level').value(0);
                if (level > highest) {
                    // scan for the highest level character owned by each player
                    highest = level;
                    highestIndex = i;
                }
            }
            if (highest > 0) {
                // preselect highest level character, if any
                characters[highestIndex].selected = new ConfigurationBoolean(true);
            }
            this.characters = this.characters.concat(characters);
        }
        for (let pc of this.characters) {
            debug.log(`${pc.player.name} ${pc.character.name} ${pc.selected.value()}`);
        }
    }

    parse(text: string, context: ParserContext): Promise<Result> {
        let tokens = Tokenizer.tokenize(text);
        if (tokens.length < 4) {
            return new Failure(new Error(`must specify 'USER_ID character CHARACTER_ID selected TRUE/FALSE/BLANK'`)).resolve();
        }
        if (tokens.length === 4) {
            // reset to default
            tokens.push('');
        }
        for (let pc of this.characters) {
            if (pc.player.userid !== tokens[0]) {
                continue;
            }
            if ('character' !== tokens[1]) {
                return new Failure(new Error(`must specify 'USER_ID character ...'`)).resolve();
            }
            if (pc.character.id !== tokens[2]) {
                continue;
            }
            if ('selected' !== tokens[3]) {
                return new Failure(new Error(`must specify 'USER_ID character CHARACTER_ID selected ...'`)).resolve();
            }
            return pc.selected.parse(tokens[4], context);
        }
        return new Failure(new Error(`the specified player and character combination does not exist`)).resolve();
    }

    export(context: ExportContext): void {
        // do not export, this object is ephemeral
    }
    
    count(): number {
        return this.characters.reduce((count, item) => {
            return count + (item.selected.value() ? 1 : 0);
        }, 0);
    }

    included(): PlayerCharacter[] {
        return this.characters.filter(pc => {
            return pc.selected.value();
        });
    }
    
    averagePartyLevel(): number {
        let count = 0;
        let total = 0;
        for (let pc of this.characters) {
            if (pc.selected.value()) {
                count += 1;
                const level = pc.character.attribute('level').value(0);
                if (level < 1) {
                    // uninitialized, might be Beyond20 for example and we did not fix it in the UI
                    // XXX edit levels in the UI after scan
                    return 0;
                }
                total += level;
            }
        }
        if (count === 0) {
            return 0;
        }
        return total / count;
    }

    clear(): void {
        debug.log('discarding player character scan');
        this.characters = [];
    }

    clone(): PlayerCharacters {
        // we reset on clone
        debug.log('replacing player character scan with empty one');
        return new PlayerCharacters();
    }

    // not persisted
    toJSON(): any {
        return undefined;
    }
}
