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

    isNpc() {
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
    
    // XXX make this safe for unknown attributes (log and create dummy that creates on write?) 
    attribute(attributeName: string): Attribute | undefined {
        let attributes = findObjs({
            type: 'attribute',
            characterid: this.journalEntry.id,
            name: attributeName
        });
        if (attributes.length > 1) {
            console.log(`unexpected number (${attributes.length}) of instances of attribute '${attributeName}' on character '${this.journalEntry.id}'; using first one`)
        }
        if (attributes.length < 1) {
            return undefined;
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