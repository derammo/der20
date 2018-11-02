import { parseCommaSeparatedList } from "./format";

class CharacterImage {
    constructor(private imageSource: string) {
        // generated source
    }

    get url(): string {
        return this.imageSource;
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
        let flag = this.attribute(attributeName);
        if (typeof flag === 'undefined') {
            return false
        }
        return (Number(flag.get('current')) > 0)        
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
    
    level(): number {
        let attribute = this.attribute('level');
        if (attribute === undefined) {
            return 0;
        }
        return parseInt(attribute.get('current'), 10);
    }

    // REVISIT make this safe for unknown attributes (log and create dummy that creates on write?) 
    attribute(attributeName: string): Attribute {
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
        return <Attribute>attributes[0];
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

class MissingAttribute implements Attribute {
    id: string;

    set<K extends "name" | "current" | "max">(property: K, value: AttributeMutableSynchronousGetProperties[K]): void;
    set(properties: Partial<AttributeMutableSynchronousGetProperties>): void;
    set(property: any, value?: any) {
        // XXX create on write
        debug.log(this.parent);
        throw new Error("Method not implemented.");
    }

    setWithWorker<K extends "name" | "current" | "max">(property: K, value: AttributeMutableSynchronousGetProperties[K]): void;
    setWithWorker(properties: Partial<AttributeMutableSynchronousGetProperties>): void;
    setWithWorker(property: any, value?: any) {
        // XXX create on write
        throw new Error("Method not implemented.");
    }

    remove(): void {
        // it is already not present, no problem
    }

    constructor(private parent: Der20Character, private attributeName: string) {
        // generated code
    }

    get(valueName: string) {
        switch (valueName) {
            case 'name':
                return this.attributeName;
            case 'current':
                return '';
            case 'max':
                return '';
            default:
                return undefined;
        }
    }
}