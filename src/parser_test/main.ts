// application under test
import { Configuration } from "../rewards/configuration";

// libs
import { Der20Dialog } from "derlib/ui";
import { ConfigurationParser } from "derlib/config";
import { LeagueModule } from "derlib/ddal/league_module";
import { serializeWithoutNulls } from "derlib/utility";

let config = new Configuration();
let test = `
	show
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
	module current tier 3
	start
	start 1.5
	checkpoint
	checkpoint bosskill awarded true
	stop
	show
	send
	clear
	send
`;
let test2 = `
`;

export function testRun() {
	let dialog = new Der20Dialog('!rewards ');
	dialog.addButton("First", "command param param|?{Value}");
	return dialog.render();
}

export function testShow() {
	let result = ConfigurationParser.parse('show', config);
	return result.dialog;
}

function report(result: any) {
	if (Object.keys(result).length < 1) {
		return;
	}
	console.log(`result of parse: ${JSON.stringify(result)}`)
}

console.debug = ((message) => { });

for (let line of test.split('\n')) {
	let command = line.trim();
	// run including blank lines
	console.log(`testing: ${command}`);
	let result = ConfigurationParser.parse(command, config);
	report(result);
}

// separate tests for breakpointing
for (let line of test2.split('\n')) {
	let command = line.trim();
	// run including blank lines
	console.log(`testing: ${command}`);
	let result = ConfigurationParser.parse(command, config);
	report(result);
}

console.log(serializeWithoutNulls(config));
