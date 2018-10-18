import { Der20Dialog} from "derlib/ui";
import { ConfigurationParser, ConfigurationArray } from "derlib/config";
import { LeagueModule } from "derlib/ddal/league_module";

class Definitions {
    modules: ConfigurationArray<LeagueModule> = new ConfigurationArray<LeagueModule>("module", LeagueModule);
}

class Configuration {
   define: Definitions = new Definitions(); 
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
`;
for (let line of test.split('\n')) {
	let command = line.trim();
	// run including blank lines
	ConfigurationParser.parse(command, config);
}
console.log(JSON.stringify(config));