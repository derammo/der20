import { Der20Dialog} from "derlib/ui";
import { ConfigurationParser, ConfigurationArray, CollectionItem, ConfigurationStep, ConfigurationChooser, ConfigurationAlias } from "derlib/config";
import { LeagueModule } from "derlib/ddal/league_module";
import { DungeonMaster } from "derlib/ddal/dungeon_master"

class Definitions {
	modules: ConfigurationArray<LeagueModule> = new ConfigurationArray<LeagueModule>("module", LeagueModule);
	dms: ConfigurationArray<DungeonMaster> = new ConfigurationArray<DungeonMaster>("dm", DungeonMaster);
}

class Configuration {
   define: Definitions = new Definitions(); 
   dm: ConfigurationChooser<DungeonMaster> = new ConfigurationChooser(this.define.dms);
   module: ConfigurationChooser<LeagueModule> = new ConfigurationChooser(this.define.modules);
   checkpoint: ConfigurationAlias = new ConfigurationAlias(this.module, 'current checkpoint');
}

export function testRun() {
	let dialog = new Der20Dialog();
	dialog.addButton("First", "command param param|?{Value}");
	return dialog.send();
}

let config = new Configuration();
let test = `
	define module ddal12-01 checkpoint bosskill value 2
	define module ddal12-01 checkpoint bosskill name grobs killed
	define module ddal12-01 name DDAL12-01 The Killing of Grobs
	define dm ammo dci 007
	define dm ammo name Ammo Goettsch
	checkpoint bosskill awarded true
	clear
	dm
	dm ammo
	module
	module poop
	module ddal12-01
	start
	start 1.5
	checkpoint
	checkpoint bosskill awarded true
	stop
	show
`;
let test2 = `
`;

function report(result: any) {
	if (Object.keys(result).length < 1) {
		return;
	}
	console.log(`result of parse: ${JSON.stringify(result)}`)
}

for (let line of test.split('\n')) {
	let command = line.trim();
	// run including blank lines
	let result = ConfigurationParser.parse(command, config);
	report(result);
}

// separate set for breakpointing
for (let line of test2.split('\n')) {
	let command = line.trim();
	// run including blank lines
	let result = ConfigurationParser.parse(command, config);
	report(result);
}

console.log(JSON.stringify(config, (key, value) => {
	if (value === null) {
		return undefined;
	}
	return value;
}));