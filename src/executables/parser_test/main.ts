debug.log = console.log;

// OS
import { exec, ExecException } from 'child_process';

// libs
import { startPersistence } from "der20/common/persistence";
import { HelpCommand } from "der20/config/help";
import { CommandInputImpl } from "der20/config/input";
import { ConfigurationLoader } from "der20/config/loader";
import { ConfigurationParser } from "der20/config/parser";
import { DialogResult, Success } from "der20/config/result";
import { CommandInput } from "der20/interfaces/config";
import { LoaderContext } from "der20/interfaces/loader";
import { ParserContext } from "der20/interfaces/parser";
import { Result } from "der20/interfaces/result";
import { DialogFactory } from "der20/interfaces/ui";
import { Options } from "der20/plugin/options";
import { Der20ChatDialog } from "der20/roll20/dialog";

// application under test
import { Configuration } from "plugins/league/configuration";

class MockContext implements LoaderContext, ParserContext {
	command: string;
	asyncVariables: Record<string, any> = {};
	input: CommandInput = new CommandInputImpl.Base(CommandInput.Kind.journal);
	dialog: DialogFactory = Der20ChatDialog;
	options: Options = new Options();

	constructor(public rest: string) {
		this.command = 'mock';
	}

	swapIn(): void {
		// do nothing
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
ConfigurationLoader.restore(json, configurationRoot, new MockContext(""));

let test = `
	reset all configuration
	option handouts journal true
	option handouts archived false
	show
	send
	define rules advancement downtime multiplier 2.5
	define rules advancement downtime unit 0.5
	define rules advancement renown multiplier 0.25
	define rules advancement renown unit 0.5
	define module ddal12-01 objective bosskill treasure 2
	define module ddal12-01 objective bosskill advancement 1
	define module ddal12-01 objective bosskill name grobs was killed
	define module ddal12-01 name DDAL12-01 The Killing of Grobs
	define module ddal12-01 unlock hat name Hat of Disguise
	define module ddal12-01 unlock hat description The entire length of this broad, red-silk ribbon is embroidered in gold thread. While wearing it, the wearer can read and understand, but not speak, Undercommon.
	define module ddal12-01 unlock hat players true
	define module ddal12-01 unlock hat dm false
	define module ddal12-01 unlock hat table F
	define module ddal12-01 unlock hat rarity Uncommon
	define module ddal12-01 objective bosskill dm true
	define module ddal12-01 objective bosskill players true
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
	session module current objective bosskill awarded true
	define dm junk
	session dm junk
	delete dm junk
	define module trash
	session module trash
	delete module trash
	clear
	session dm
	session dm ammo
	session module
	session module poop
	session module ddal12-01
	session module current tier 3
	session module current session 2
	session module current session 3
	session start
	session start 1.5
	session module current objective
	session module current objective bosskill awarded true
	session stop
	session show
	rewards preview
	rewards send
`;

let test2 = `delete module ddal08-74
option command hello
option command hello there
option command hello,
option delete command hello there
`;

let test3 = `reset all configuration
delete module ddal08-74
define module ddal08-74 name DDAL08-74 The Killing of Grobs
define module ddal08-74 season 8
define module ddal08-74 tier 3
define module ddal08-74 hardcover false
define module ddal08-74 duration 4
define module ddal08-74 level maximum 13
define module ddal08-74 objective bosskill advancement 2
define module ddal08-74 objective bosskill treasure 2
define module ddal08-74 objective bosskill name Grobs was killed
define module ddal08-74 objective bunny advancement 2
define module ddal08-74 objective bunny treasure 2
define module ddal08-74 objective bunny name All players made friends with the Bunny
define module ddal08-74 unlock hat name Hat of Disguise
define module ddal08-74 unlock hat description The entire length of this broad, red-silk ribbon is embroidered in gold thread. While wearing it, the wearer can read and understand, but not speak, Undercommon.
define module ddal08-74 unlock hat table F
define module ddal08-74 unlock hat rarity Uncommon
define dm ammo dci blablablabh
define dm ammo name Ammo Goettsch
session dm ammo
session module ddal08-74`;

export function testRun(): string {
	let dialog = new Der20ChatDialog();
	dialog.addCommand("First", "command param param|?{Value}", {command: 'command'});
	return dialog.render();
}

export function testDialog(rest: string): Promise<string> {
	return ConfigurationParser.parse(rest, configurationRoot, new MockContext(rest))
		.then((result: Result) => {
			if (result.kind === Result.Kind.dialog) {
				return (<DialogResult>result).dialogs.join('\n');
			}
			return '';
		})
}

function handleResult(result: Result): Result {
	if (result.events.has(Result.Event.change)) {
		debug.log('	change event received from parse; writing configuration');
		let text = JSON.stringify(configurationRoot);
		// now that everything is clean, convert back to a dictionary
		let cleaned = JSON.parse(text);
		persistence.save(cleaned);
	}


	// if (result.kind !== Result.Kind.success) {
		debug.log(`result of parse:\n${JSON.stringify(result, null, 2).substr(0,119)}\n`)
	// }
	return result;
}

console.debug = ((message: any) => { /* ignore */ });

function testParse(): void {
	if (true) {
		testParse1();
	}

	// separate tests for breakpointing
	if (true) {
		testParse2();
	}

	if (false) {
		testParse3();
	}
} 

function testLine(rest: string): Promise<Result> {
	let command = rest.trim();
	// run including blank lines
	debug.log(`testing: ${command}`);
	if (command === 'reset all configuration') {
		// this is implemented in the plugin, so we fake it here
		configurationRoot = new Configuration();
		return new Success("").resolve();
	}
	return ConfigurationParser.parse(command, configurationRoot, new MockContext(rest))
		.then(handleResult);
}

function testParse3() {
	testLines(test3);
}

function testParse2() {
	testLines(test2);
}

function testParse1() {
	testLines(test);
}

function testLines(text: string) {
	let running = new Success("").resolve();
	for (let line of text.split('\n')) {
		running = running
			.then((result: Result) => testLine(line));
	}
}

function tidy(text: string): void {
	let child = exec('tidy -iq', (error: ExecException, stdout: string, stderr: string) => { 
		// we read output by pipe and ignore errors
	});
	child.stdout.pipe(process.stdout);
	child.stdin.write(text);
	child.stdin.end();	
}

testParse();

if (typeof(require) === 'function') {
	const process = require('process'); 
	if (process !== undefined) {
		process.stdout.write(JSON.stringify(configurationRoot, undefined, 2));
		testDialog('session show')
			.then((text: string) => {
				tidy(text);
			});
	}
}
