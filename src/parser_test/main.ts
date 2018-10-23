// application under test
import { Configuration } from "../rewards/configuration";

// libs
import { Der20Dialog } from "derlib/roll20/dialog";
import { ConfigurationStep } from "derlib/config/atoms";
import { LeagueModule } from "derlib/ddal/league_module";
import { startPersistence } from "derlib/persistence";
import { Result } from "derlib/config/result";

let config = new Configuration();
let persistence = startPersistence('parser_test');
let json = persistence.load();
ConfigurationParser.restore(json, config);

let test = `
	delete all configuration
	show
	send
	define rules advancement downtime multiplier 2.5
	define rules advancement downtime unit 0.5
	define rules advancement renown multiplier 0.25
	define rules advancement renown unit 0.5
	define module ddal12-01 checkpoint bosskill treasure 2
	define module ddal12-01 checkpoint bosskill advancement 1
	define module ddal12-01 checkpoint bosskill name grobs was killed
	define module ddal12-01 name DDAL12-01 The Killing of Grobs
	define module ddal12-01 unlock hat name Hat of Disguise
	define module ddal12-01 unlock hat description The entire length of this broad, red-silk ribbon is embroidered in gold thread. While wearing it, the wearer can read and understand, but not speak, Undercommon.
	define module ddal12-01 unlock hat players true
	define module ddal12-01 unlock hat dm false
	define module ddal12-01 unlock hat table F
	define module ddal12-01 checkpoint bosskill dm true
	define module ddal12-01 checkpoint bosskill players true
	define module ddal12-01 season 12
	define module ddal12-01 tier 1
	define module ddal12-01 hardcover false
	define module ddal12-01 duration 4
	define module ddal12-01 level minimum 2
	define module ddal12-01 level maximum 3
	define module ddal12-01 hourly treasure 1
	define module ddal12-01 hourly advancement 1
	define dm ammo dci 007
	define dm ammo name Ammo Goettsch
	checkpoint bosskill awarded true
	define dm junk
	dm junk
	delete dm junk
	define module trash
	module trash
	delete module trash
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
`;
let test2 = `define module ddal12-01 level minimum 2`;

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

function handleResult(result: Result.Any) {
	if (result.events.has(Result.Event.Change)) {
		let text = JSON.stringify(config);
		// now that everything is clean, convert back to a dictionary
		let cleaned = JSON.parse(text);
		persistence.save(cleaned);
	}
	if (result.kind != Result.Kind.Success) {
		console.log(`	result of parse: ${JSON.stringify(result).substr(0,119)}`)
	}
}

console.debug = ((message) => { });

function testParse(): void {
	testParse1();

	// separate tests for breakpointing
	testParse2();
}

function testParse2() {
	for (let line of test2.split('\n')) {
		let command = line.trim();
		// run including blank lines
		console.log(`testing: ${command}`);
		let result = ConfigurationParser.parse(command, config);
		handleResult(result);
	}
}

function testParse1() {
	for (let line of test.split('\n')) {
		let command = line.trim();
		// run including blank lines
		console.log(`testing: ${command}`);
		let result = ConfigurationParser.parse(command, config);
		handleResult(result);
	}
}

import { exec } from 'child_process';
import { ConfigurationParser } from "derlib/config/parser";
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

testParse();
// console.log(tidy(testDialog('show')));
