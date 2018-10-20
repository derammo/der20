// application under test
import { Configuration } from "../rewards/configuration";

// libs
import { Der20Dialog } from "derlib/roll20/dialog";
import { ConfigurationParser } from "derlib/config";
import { LeagueModule } from "derlib/ddal/league_module";
import { serializeWithoutNulls } from "derlib/utility";
import { Result } from "derlib/config/result";

let config = new Configuration();
let test = `
	show
	define module ddal12-01 checkpoint bosskill treasure 2
	define module ddal12-01 checkpoint bosskill advancement 1
	define module ddal12-01 checkpoint bosskill downtime 0
	define module ddal12-01 checkpoint bosskill name grobs was killed
	define module ddal12-01 name DDAL12-01 The Killing of Grobs
	define module ddal12-01 unlock hat name Hat of Disguise
	define module ddal12-01 unlock hat description The entire length of this broad, red-silk ribbon is embroidered in gold thread. While wearing it, the wearer can read and understand, but not speak, Undercommon.
	define module ddal12-01 unlock hat players true
	define module ddal12-01 unlock hat dm false
	define module ddal12-01 unlock hat table f
	define module ddal12-01 checkpoint bosskill dm true
	define module ddal12-01 checkpoint bosskill players true
	define module ddal12-01 season 12
	define module ddal12-01 tier 1
	define module ddal12-01 level minimum 1
	define module ddal12-01 level maximum 4
	define module ddal12-01 hourly treasure 0
	define module ddal12-01 hourly advancement 0
	define module ddal12-01 hourly downtime 0
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
	module current session 2
	session 3
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

export function testRun(): string {
	let dialog = new Der20Dialog('!rewards ');
	dialog.addButton("First", "command param param|?{Value}");
	return dialog.render();
}

export function testDialog(command: string): string {
	let result = ConfigurationParser.parse(command, config);
	if (result.kind == Result.Kind.Dialog) {
		return (<Result.Dialog>result).dialog;
	}
	return '';
}

function report(result: any) {
	if (Object.keys(result).length < 1) {
		return;
	}
	if (result.kind != Result.Kind.Success) {
		console.log(`	result of parse: ${JSON.stringify(result).substr(0,76)}`)
	}
}

console.debug = ((message) => { });

function testParse() {
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
	return serializeWithoutNulls(config);
}

let json = testParse();
// console.log(json);

import { exec } from 'child_process';
function tidy(text: string): string {
	if (!exec) {
		// if running under Roll20, we don't have child_process
		return text;
	}
	var output;
	var child = exec('tidy -iq', function(error, stdout, stderr) {
	});
	child.stdout.pipe(process.stdout);
	child.stdin.write(text);
	child.stdin.end();	
	return output;
}

// console.log(tidy(testDialog('send')));
