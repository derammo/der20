import { parseCommaSeparatedList } from "./format";

class CharacterImage {
    constructor(private imageSource: string) {
        // generated source
    }

    get url(): string {
        return this.imageSource;
    }
}

export class Der20Attribute {
    constructor(private data: Attribute) {
        // generated code
    }

    static create(character: Der20Character, name: string) : Der20Attribute {
        const raw : Attribute = createObj("attribute", { _characterid: character.id, name: name });
        return new Der20Attribute(raw);
    }

    get raw(): Attribute {
        return this.data;
    }

    get exists(): boolean {
        return this.data !== undefined;
    }
    
    value(defaultValue: number): number;
    value(defaultValue: string): string;
    value(defaultValue: any): any {
        let value;
        if (this.data !== undefined) {
            value = this.data.get('current');
            if (value === undefined) {
                value = defaultValue;
            }
        } else {
            value = defaultValue;
        }
        if (typeof defaultValue === 'number') {
            return parseFloat(value);
        }
        return value;
    }

    max(defaultValue: number): number;
    max(defaultValue: string): string;
    max(defaultValue: any): any {
        let value;
        if (this.data !== undefined) {
            value = this.data.get('max');
            if (value === undefined) {
                value = defaultValue;
            }
        } else {
            value = defaultValue;
        }
        if (typeof defaultValue === 'number') {
            return parseInt(value, 10);
        }
        return value;
    }

    get id(): string {
        if (this.data === undefined) {
            return '';
        }
        return this.data.id;
    }
}

export class Der20Character {
    constructor(private journalEntry: Character) {
        // generated code
    }

    static byName(name: string): Der20Character | undefined {
        let objects = findObjs( { _type: 'character', name: name } );
        if ((objects.length < 1) || (objects[0] === undefined)) {
            debug.log(`character with name '${name}' was not found`);
            return undefined
        }
        if (objects.length > 1) {
            console.log(`unexpected number (${objects.length}) of instances of character with name '${name}'; using first one`)
        }
        return new Der20Character(<Character>objects[0]);
    }

    // returns all characters
    static all(): Der20Character[] {
        let objects = findObjs({ _type: 'character' }).filter((object) => { return object !== undefined; });
        return objects.map((raw) => { return new Der20Character(<Character>raw); });
    }

    // returns all characters owned by at least one player but not all players
    static owned(): (Der20Character & { controlledby?: string[] }) [] {
        let objects = findObjs({ _type: 'character' });
        let results = [];
        for (let object of objects) {
            if (object === undefined) {
                continue;
            }
            let character = <Character>object;
            let owners = parseCommaSeparatedList(character.get('controlledby'))
            if (owners.length === 0) {
                // unowned
                continue;
            }
            if (owners.some((owner) => { return owner === 'all' })) {
                // owned by everyone
                continue;
            }
            let wrapper: Der20Character & { controlledby?: string[] } = new Der20Character(character);
            wrapper.controlledby = owners;
            results.push(wrapper);
        }
        return results;
    }

    isNpc(): boolean {
        return this.checkFlag('npc');
    }

    checkFlag(attributeName: string): boolean {
        return (this.attribute(attributeName).value(0) > 0);
    }

    get id(): string {
        return this.journalEntry.get('_id');
    }
    
    get name(): string {
        return this.journalEntry.get('name');
    }
    
    get raw(): Character {
        return this.journalEntry;
    }

    get href(): string {
        return `https://journal.roll20.net/character/${this.id}`;
    }
    
    // REVISIT make this safe for unknown attributes (log and create dummy that creates on write?) 
    attribute(attributeName: string): Der20Attribute {
        let attributes = findObjs({
            type: 'attribute',
            characterid: this.journalEntry.id,
            name: attributeName
        });
        if (attributes.length > 1) {
            console.log(`unexpected number (${attributes.length}) of instances of attribute '${attributeName}' on character '${this.journalEntry.id}'; using first one`)
        }
        if (attributes.length < 1) {
            return new MissingAttribute(this, attributeName);
        }
        return new Der20Attribute(<Attribute>attributes[0]);
    }

    imageLoad(): Promise<CharacterImage> {
        return new Promise((resolve, reject) => {
            this.raw.get('_defaulttoken', (text: string) => {
                let data = JSON.parse(text);
                resolve (new CharacterImage(data.imgsrc));
            });
        });  
    }
}

class MissingAttribute extends Der20Attribute {
    set<K extends "name" | "current" | "max">(property: K, value: AttributeMutableSynchronousGetProperties[K]): void;
    set(properties: Partial<AttributeMutableSynchronousGetProperties>): void;
    set(property: any, value?: any) {
        // XXX create on write?
        debug.log(`${this.parent} attribute ${this.attributeName}`);
        throw new Error("Method not implemented.");
    }

    setWithWorker<K extends "name" | "current" | "max">(property: K, value: AttributeMutableSynchronousGetProperties[K]): void;
    setWithWorker(properties: Partial<AttributeMutableSynchronousGetProperties>): void;
    setWithWorker(property: any, value?: any) {
        // XXX create on write?
        throw new Error("Method not implemented.");
    }

    remove(): void {
        // it is already not present, no problem
    }

    constructor(private parent: Der20Character, private attributeName: string) {
        super(undefined);
        // generated code
    }
}