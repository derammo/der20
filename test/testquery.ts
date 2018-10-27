// adapted from https://stackoverflow.com/questions/1714786/query-string-encoding-of-a-javascript-object
function serialize(obj: any, prefix: string) {
    let text: string[] = [];
    let key: string;
    for (key in obj) {
        if (obj.hasOwnProperty(key)) {
            let queryVariable = prefix ? prefix + '[' + key + ']' : key;
            let value = obj[key];
            if (value !== null && typeof value === 'object') {
                // recurse
                let contents = serialize(value, queryVariable);
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

let calculated = serialize(
    {
        advancement_checkpoints: 4,
        adventure_title: 'Imported Wonder Land',
        magic_items_attributes: [
            { }, // this empty element is here to make the array in the query string 1-based as rails expects it
            {
                _destroy: false,
                character_id: 17,
                id: 1,
                location_found: '',
                name: 'Axe of Wow',
                not_included_in_count: false,
                notes: '',
                rarity: 'very_rare',
                table: 'H',
                table_result: '',
                tier: 2
            }
        ],
        tier: 2,
        treasure_checkpoints: 4
    },
    'character_log_entry'
);

let actual =
    'character_log_entry%5Badvancement_checkpoints%5D=4&character_log_entry%5Badventure_title%5D=Imported+Wonder+Land&character_log_entry%5Bmagic_items_attributes%5D%5B1%5D%5B_destroy%5D=false&character_log_entry%5Bmagic_items_attributes%5D%5B1%5D%5Bcharacter_id%5D=17&character_log_entry%5Bmagic_items_attributes%5D%5B1%5D%5Bid%5D=1&character_log_entry%5Bmagic_items_attributes%5D%5B1%5D%5Blocation_found%5D=&character_log_entry%5Bmagic_items_attributes%5D%5B1%5D%5Bname%5D=Axe+of+Wow&character_log_entry%5Bmagic_items_attributes%5D%5B1%5D%5Bnot_included_in_count%5D=false&character_log_entry%5Bmagic_items_attributes%5D%5B1%5D%5Bnotes%5D=&character_log_entry%5Bmagic_items_attributes%5D%5B1%5D%5Brarity%5D=very_rare&character_log_entry%5Bmagic_items_attributes%5D%5B1%5D%5Btable%5D=H&character_log_entry%5Bmagic_items_attributes%5D%5B1%5D%5Btable_result%5D=&character_log_entry%5Bmagic_items_attributes%5D%5B1%5D%5Btier%5D=2&character_log_entry%5Btier%5D=2&character_log_entry%5Btreasure_checkpoints%5D=4';

for (let index = 0; index < actual.length; index += 16) {
    let left = actual.slice(index, index + 16);
    let right = calculated.slice(index, index + 16);
    if (left === right) {
        continue;
    }
    console.log(index);
    console.log(`rails:      ${left}`);
    console.log(`calculated: ${right}`);
    console.log('\n');
    throw new Error('failed to match actual encoding');
}

// REVISIT remap keys to single letters, unmap in import controller
// could just do 'character_log_entry' and 'magic_items_attributes' and leave rest alone
let testing = serialize(
    {
        advancement_checkpoints: 4,
        adventure_title: 'Imported Wonder Land',
        dm_name: 'Ammo Goettsch',
        dm_dci_number: '7777777777',
        downtime_gained: 5,
        location_played: 'Roll20',
        treasure_tier: 2,
        treasure_checkpoints: 4,
        notes: `yadda yadda yadda some text some more text oh look some more texts
        Continental or mainland Europe is the continuous continent of Europe excluding its surrounding islands.[1] It can also be referred to ambiguously as the European continent – which can conversely mean the whole of Europe – and by Europeans, simply the Continent.

        The most common definition of continental Europe excludes continental islands, encompassing the Greek Islands, Cyprus, Malta, Sicily, Sardinia, Corsica, the Balearic Islands, Ireland, Great Britain, the Isle of Man, the Channel Islands, Novaya Zemlya and the Danish archipelago, as well as nearby oceanic islands, including the Canary Islands, Madeira, the Azores, Iceland, the Faroe Islands, and Svalbard.
        
        The Scandinavian Peninsula is sometimes also excluded, as even though it is technically part of "mainland Europe", the de facto connections to the rest of the continent are across the Baltic Sea or North Sea (rather than via the lengthy land route that involves travelling to the north of the peninsula where it meets Finland, and then south through north-east Europe).
        
        The old notion of Europe as a geopolitical or cultural term was centred on core Europe (Kerneuropa), the continental territory of the historical Carolingian Empire and the core of Latin Christendom[citation needed], corresponding to modern France, Italy, Germany (or German-speaking Europe) and the Benelux states (historical Austrasia). This historical core of "Carolingian Europe" was consciously invoked in the 1950s as the historical ethno-cultural basis for the prospective European integration        `,
        renown_gained: 0.5,
        // magic_items_attributes: [ { name: 'dummy'} ]
        magic_items_attributes: [
            {
                location_found: 'Imported Wonder Land',
                name: 'Axe of Wow',
                notes: 'this is just... wow',
                rarity: 'very_rare',
                table: 'H',
                table_result: 86,
                tier: 2
            }
        ]
   },
    'character_log_entry'
);


const url = `http://localhost:3000/character_log_imports/new?${testing}`;
console.log(`length ${url.length}`);
console.log(url);

// seems like something only allows 1021 characters?  it appears to be the shell so maybe we dont have to do anything about it
// RESOLVED: it was Terminal app's client.  now using iTerm2 and limit is much greater

// test exactly how many bytes we can pass from roll20 in a sane browser (Chrome, Safari, Firefox) then make configurable limit on roll20 side.
// if that is even the problem (puma should have 10,240 hard coded limit)
// encode URL: if over limit, shrink notes, then item notes to fit
let longUrl = 'http://10.0.4.30/test?';
let a = ('a'.charCodeAt(0));
let z = ('z'.charCodeAt(0));
for (let i=a; i<=z; i++) {
    longUrl += String.fromCharCode(i).repeat(96);
    longUrl += '=0&'
}
longUrl += 'end=1';
console.log(longUrl);