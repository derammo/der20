debug.log = console.log;

// application under test
import { Configuration } from "plugins/rewards/configuration";

// OS
import { exec, ExecException } from 'child_process';

// libs
import { startPersistence } from "der20/common/persistence";
import { Result } from "der20/interfaces/result";
import { Options } from "der20/plugin/options";
import { ConfigurationParser } from "der20/config/parser";
import { ConfigurationLoader } from "der20/config/loader";
import { HelpCommand } from "der20/config/help";
import { Der20ChatDialog } from "der20/roll20/dialog";
import { DialogFactory } from "der20/interfaces/ui";
import { LoaderContext } from "der20/interfaces/loader";
import { ParserContext } from "der20/interfaces/parser";
import { ConfigurationSource } from "der20/interfaces/config";
import { ConfigurationSourceImpl } from "der20/config/source";
import { DialogResult } from "der20/config/result";

class MockContext implements LoaderContext, ParserContext {
	command: string;
	rest: string;
	asyncVariables: Record<string, any> = {};
	source: ConfigurationSource = new ConfigurationSourceImpl.Journal('test', 'main');
	dialog: DialogFactory = Der20ChatDialog;
	options: Options = new Options();

	addCommand(source: ConfigurationSource, command: string): void {
		throw new Error("Method not implemented.");
	}
	addAsynchronousLoad<T>(promise: Promise<T>, whenDone: (value: T) => void): void {
		throw new Error("Method not implemented.");
	}
	addMessage(message: string): void {
		debug.log(message);
	}
}

let configurationRoot: any = new Configuration();
configurationRoot.help = new HelpCommand('parser_test', configurationRoot);
let persistence = startPersistence('parser_test');
let json = persistence.load();
ConfigurationLoader.restore(json, configurationRoot, new MockContext());

let test = `
	reset all configuration
	${Options.pluginOptionsKey} handouts journal true
	${Options.pluginOptionsKey} handouts archived false
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
	define module ddal12-01 unlock hat rarity Uncommon
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
	define dm ammo dci 0070070007
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
	preview
	send
`;

let test2 = `option command hi
option command hello there
option command hello,
option delete command hello there
`;

let test3 = `
reset all configuration
delete module ddal08-74
define module ddal08-74 name DDAL08-74 The Killing of Grobs
define module ddal08-74 season 8
define module ddal08-74 tier 3
define module ddal08-74 hardcover false
define module ddal08-74 duration 4
define module ddal08-74 level maximum 13
define module ddal08-74 checkpoint bosskill advancement 2
define module ddal08-74 checkpoint bosskill treasure 2
define module ddal08-74 checkpoint bosskill name Grobs was killed
define module ddal08-74 checkpoint bunny advancement 2
define module ddal08-74 checkpoint bunny treasure 2
define module ddal08-74 checkpoint bunny name All players made friends with the Bunny
define module ddal08-74 unlock hat name Hat of Disguise
define module ddal08-74 unlock hat description The entire length of this broad, red-silk ribbon is embroidered in gold thread. While wearing it, the wearer can read and understand, but not speak, Undercommon.
define module ddal08-74 unlock hat table F
define module ddal08-74 unlock hat rarity Uncommon
define dm ammo dci blablablabh
define dm ammo name Ammo Goettsch
dm ammo
module ddal08-74`;

export function testRun(): string {
	let dialog = new Der20ChatDialog();
	dialog.addCommand("First", "command param param|?{Value}", {command: 'command'});
	return dialog.render();
}

export function testDialog(command: string): string {
	let result = ConfigurationParser.parse(command, configurationRoot, new MockContext());
	if (result.kind === Result.Kind.Dialog) {
		return (<DialogResult>result).dialog;
	}
	return '';
}

function handleResult(result: Result) {
	if (result.events.has(Result.Event.Change)) {
		debug.log('	change event received from parse; writing configuration');
		let text = JSON.stringify(configurationRoot);
		// now that everything is clean, convert back to a dictionary
		let cleaned = JSON.parse(text);
		persistence.save(cleaned);
	}
	if (result.kind !== Result.Kind.Success) {
		debug.log(`	result of parse: ${JSON.stringify(result).substr(0,119)}`)
	}
}

console.debug = ((message: any) => { /* ignore */ });

function testParse(): void {
	testParse1();

	// separate tests for breakpointing
	testParse2();

	testParse3();
}

function testLine(line: string) {
	let command = line.trim();
	// run including blank lines
	debug.log(`testing: ${command}`);
	if (command === 'reset all configuration') {
		// this is implemented in the plugin, so we fake it here
		configurationRoot = new Configuration();
		return;
	}
	let result = ConfigurationParser.parse(command, configurationRoot, new MockContext());
	handleResult(result);	
}

function testParse3() {
	for (let line of test3.split('\n')) {
		testLine(line);		
	}
}

function testParse2() {
	for (let line of test2.split('\n')) {
		testLine(line);		
	}
}

function testParse1() {
	for (let line of test.split('\n')) {
		testLine(line);		
	}
}

function tidy(text: string): string {
	if (!exec) {
		// if running under Roll20, we don't have child_process
		return text;
	}
	var output;
	var child = exec('tidy -iq', (error: ExecException, stdout: string, stderr: string) => { 
		// we read output by pipe and ignore errors
	});
	child.stdout.pipe(process.stdout);
	child.stdin.write(text);
	child.stdin.end();	
	return output;
}

testParse();
debug.log(JSON.stringify(configurationRoot));
debug.log(tidy(testDialog('show')));
