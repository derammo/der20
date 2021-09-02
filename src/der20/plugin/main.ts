import { startPersistence } from 'der20/common/persistence';
import { cloneExcept, DefaultConstructed } from 'der20/common/utility';
import { ConfigurationCommand, ConfigurationSimpleCommand } from 'der20/config/atoms';
import { config } from 'der20/config/decorators';
import { common, HelpCommand } from 'der20/config/help';
import { ConfigurationLoader } from 'der20/config/loader';
import { ConfigurationParser } from 'der20/config/parser';
import { ConfigurationPersistence } from 'der20/config/persistence';
import { Change, DialogResult, Failure } from 'der20/config/result';
import { CommandInput } from 'der20/interfaces/config';
import { LoaderContext } from 'der20/interfaces/loader';
import { ParserContext } from 'der20/interfaces/parser';
import { Result } from 'der20/interfaces/result';
import { CommandSink, CommandSource, CommandSourceFactory } from 'der20/interfaces/source';
import { Dialog } from 'der20/interfaces/ui';
import { BuiltinConfiguration } from 'der20/plugin/configuration';
import { ContextHost } from 'der20/plugin/context_base';
import { Options } from 'der20/plugin/options';
import { ApiCommandInput, ChatCommandSource } from './chat';
import { DefaultConfigSource, der20DefaultConfiguration } from './default_config';
import { ErrorReporter } from './error_reporter';
import { ConfigurationExportCommand } from './export';
import { PluginLoaderContext } from './loader_context';
import { PluginParserContext } from './parser_context';

// from our wrapper
declare var der20ScriptMode: string | undefined;

/**
 * operational status of this plugin, used to know if new commands can be scheduled
 */
// eslint-disable-next-line no-shadow
enum PluginStatus {
    operational = 1,
    crashed = 2,
    stopping = 3
}

/**
 * the private implementation class that runs a plugin, without the plugin code being able to see it
 */
class PluginImplementation<T> implements CommandSink, ContextHost {
    // current configuration
    configurationRoot: T & BuiltinConfiguration;

    // current options, either static or from configurationRoot
    options: Options;

    // '!' commands supported by this plugin by default
    private builtinCommands: Set<string> = new Set();

    // configuration storage
    persistence: ConfigurationPersistence;

    // sources of configuration commands
    commandSources: CommandSource[] = [];

    // execution queue implemented by most recently submitted work item, 
    // dependent on every previous one 
    private running: Promise<PluginStatus> = Promise.resolve(PluginStatus.operational);
    private stopping: boolean = false;

    // logging functions that can be swapped based on debug flags
    private ignoreLog = ((message: string) => {
        // ignore
    });
    private consoleLog: (message: string) => void = this.ignoreLog;
    private debugLog: (message: string) => void = this.ignoreLog;

    constructor(public name: string, public factory: DefaultConstructed<T>) {
        this.consoleLog = (message: string) => {
            let stamp = new Date().toISOString();
            log(`${stamp} ${name}: ${message}`)
        };

        // XXX temp remove
        this.setDebug(true);

        // redirect logs
        this.swapIn();
    }

    /**
     * called when plugin crashed on startup, to make sure it doesn't do things
     */ 
    disable() {
        this.builtinCommands = new Set();
        this.options = new Options();
    }

    /**
     * build the default state of the world, either on start up or to return to default configuration
     */
    defaultConfiguration() {
        // create the world
        this.configurationRoot = <T & BuiltinConfiguration>new this.factory();

        // built in top-level commands for this plugin
        this.builtinCommands = new Set([this.name]);

        // sanity check to make sure code in Options class matches this
        if (Options.pluginOptionsKey !== 'options') {
            throw new Error(`broken implementation: common options must be stored under key 'options'`);
        }

        // check for common options
        this.patchOptions();

        // add debug commmand
        this.patchDumpCommand();

        // add change handling for debug flag, since we have to write it to execution context
        this.registerForDebugChanges();

        // add reset command
        this.patchResetCommand();

        // add export command
        this.patchExportCommand();

        // add help command
        // WARNING: must be added last, because it enumerates the world when constructed
        this.patchHelpCommand();
    }

    private patchHelpCommand(): void {
        if (this.configurationRoot.help === undefined) {
            this.configurationRoot.help = new HelpCommand(this.name, this.configurationRoot);
            common('PLUGIN')(this.configurationRoot.constructor.prototype, 'help');
            config(this.configurationRoot.constructor.prototype, 'help');
        }
    }

    private patchExportCommand(): void {
        if (this.configurationRoot.export === undefined) {
            this.configurationRoot.export = new ConfigurationExportCommand(this, this.configurationRoot);
            common('PLUGIN')(this.configurationRoot.constructor.prototype, 'export');
            config(this.configurationRoot.constructor.prototype, 'export');
        }
    }

    private patchResetCommand(): void {
        if (this.configurationRoot.reset === undefined) {
            this.configurationRoot.reset = new ResetCommand(this);
            common('PLUGIN')(this.configurationRoot.constructor.prototype, 'reset');
            config(this.configurationRoot.constructor.prototype, 'reset');
        }
    }

    private registerForDebugChanges(): void {
        this.options.onChangeEvent(keyword => {
            switch (keyword) {
                case 'debug':
                    this.setDebug(this.options.debug.value());
                    this.swapIn();
                    break;
                default:
                // ignore
            }
            return Promise.resolve();
        });
    }

    private patchDumpCommand(): void {
        if (this.configurationRoot.dump === undefined) {
            this.configurationRoot.dump = new DumpCommand(this);
            common('PLUGIN')(this.configurationRoot.constructor.prototype, 'dump');
            config(this.configurationRoot.constructor.prototype, 'dump');
        }
    }

    private patchOptions(): void {
        if (this.configurationRoot.options === undefined) {
            // options not supported, so we use fixed configuration
            this.options = new Options();
        } else {
            // options will be configurable
            this.options = this.configurationRoot.options;
            debug.log(`plugin has options: ${Object.getOwnPropertyNames(this.options)}`);
        }
    }

    private restoreConfiguration(): Promise<LoaderContext> {
        let json = this.persistence.load();
        let context = new PluginLoaderContext(this, this.freezeOptions());
        return ConfigurationLoader.restore(json, this.configurationRoot, context)
            .then(() => {
                this.swapIn();
                debug.log('configuration restored from persistence'); 
                return context; 
            });
    }

    private initializeConfiguration(): Promise<void> {
        debug.log(`loading configuration for ${this.name}`);

        // load config from persistence
        return this.restoreConfiguration()
            // then start up all the command sources and process their commands
            .then((context: LoaderContext) => {
                this.swapIn();
                return context; 
            })
            // REVISIT: why does .then(this.startCommandSources) not work correctly?
            .then((context: LoaderContext) => this.startCommandSources(context))
            .then((_result: void[]) => { return Promise.resolve(); });
    }

    private startCommandSources(context: LoaderContext): Promise<void[]> {
        return Promise.all(this.commandSources.map((commandSource) => {
                this.swapIn();
                debug.log(`starting up command source ${commandSource.constructor.name}`);
                return commandSource.restore(context);
            }));
    }

    private handleParserResult(status: PluginStatus, context: PluginParserContext, result: Result): PluginStatus {
        this.swapIn();

        // REVISIT make this a debuggable thing, maybe include last few ones in dump?
        debug.log(`parser result: ${JSON.stringify(result)}`);
        if (result.events.has(Result.Event.change)) {
            debug.log('change event received from command; writing state');
            this.saveConfiguration();
        }

        // echo on last round of execution
        if (context.options.echo.value() &&
            context.input.kind === CommandInput.Kind.api) {
            this.sendEcho(context, result);
        }

        // send any messages to caller, regardless of result
        if (context.options.verbose.value()) {
            this.sendMessages(result, context);
        }

        // this switch must be exhaustive
        // eslint-disable-next-line default-case
        switch (result.kind) {
            case Result.Kind.failure:
                for (const error of (<Failure>result).errors) {
                    this.reportParseError(error);
                }
                break;
            case Result.Kind.dialog:
                if (context.input.kind !== CommandInput.Kind.api) {
                    debug.log(`error: dialog generated for non-interactive configuration command '!${context.command} ${context.rest}; ignored`);
                    break;
                }
                this.sendDialog(context, result);
                break;
            case Result.Kind.success:
                break;
        }

        // NOTE: we presently never change the plugin status based on a parser result
        return status;
    }

    private sendMessages(result: Result, context: PluginParserContext): void {
        for (let message of result.messages) {
            if (context.input.kind === CommandInput.Kind.api) {
                let source = <ApiCommandInput>context.input;
                sendChat(this.name, `/w "${source.player.get('_displayname')}" ${message}`, null, { noarchive: true });
            } else {
                debug.log(`${message}`);
            }
        }
    }

    private sendEcho(context: PluginParserContext, result: Result): void {
        // NOTE: we don't actually use the contents of this dialog; it just provides the direct rendering of the command echo,
        // which is not shown in dialog style
        let echo = new context.dialog();
        let rendered = echo.renderCommandEcho(`!${context.command} ${context.rest}`, result.kind);
        let source = <ApiCommandInput>context.input;
        sendChat(this.name, `/w "${source.player.get('_displayname')}" ${rendered}`, null, { noarchive: true });
    }

    private sendDialog(context: PluginParserContext, result: Result): void {
        const source = <ApiCommandInput>context.input;
        const dialogResult = <DialogResult>result;
        for (const dialog of dialogResult.dialogs) {
            debug.log(`dialog result: ${dialog.substr(0, 16)}...`);
            switch (dialogResult.destination) {
                case DialogResult.Destination.all:
                case DialogResult.Destination.allPlayers:
                    sendChat(this.name, `${dialog}`, null);
                    break;
                case DialogResult.Destination.caller:
                    sendChat(this.name, `/w "${source.player.get('_displayname')}" ${dialog}`, null, { noarchive: true });
                    break;
                default:
                    sendChat(this.name, `/w GM ${dialog}`, null, { noarchive: true });
            }
        }
    }

    private saveConfiguration(): void {
        // export/filter every item via its toJSON method
        const text = JSON.stringify(this.configurationRoot);

        // now that everything is clean, convert back to a dictionary
        const cleaned = JSON.parse(text);

        // write to storage
        this.persistence.save(cleaned);
    }

    reportParseError(error: Error) {
        debug.log(`error from parse: ${error.message}`);
        sendChat(this.name, `/w GM ${error.message}`, null, { noarchive: true });
    }

    handleErrorThrown(error: Error, context?: PluginParserContext): PluginStatus {
        this.swapIn();

        // log and create a presentable dialog
        const dialog: Dialog = ErrorReporter.reportError(error, context);

        // present to Roll20
        sendChat(this.name, `/w GM ${dialog.render()}`, null, { noarchive: true });

        // disable plugin, so far we have no survivable errors
        return PluginStatus.crashed;
    }

    private runCommand(status: PluginStatus, context: PluginParserContext): Promise<PluginStatus> {
        const name = `!${context.command} ${context.rest}`;
        debug.log(`running ${name} in state '${PluginStatus[status]}'`);

        if (this.stopping) {
            // we need this flag because we could have been queued a while ago and were
            // just waiting on the previous work's completion
            debug.log(`${name} is canceled due to the scheduler stopping`);
            return Promise.resolve(PluginStatus.stopping);
        }

        if (status !== PluginStatus.operational) {
            // log and reject work
            debug.log("not running work because system is not operational");
            return Promise.resolve(status);
        }

        // run the work and return the new system status
        return ConfigurationParser.parse(context.rest, this.configurationRoot, context)
            .then((result: Result) => this.handleParserResult(status, context, result))
            .catch((error: any) => this.handleErrorThrown(error, context));
    }

    private scheduleCommand(context: PluginParserContext): void {
        debug.log(`scheduling !${context.command} ${context.rest}`);

        // swap in new work chained to all pending work
        this.running = this.running
            .then((status) => {
                this.swapIn();
                return this.runCommand(status, context);
            });
    }

    /**
     * returns frozen copy of current options
     */
    private freezeOptions(): Options {
        if (this.configurationRoot.options === undefined) {
            // options are not configurable, so we don't have to copy them
            return this.options;
        }
        return cloneExcept(Options, this.options, ['changeEventHandler']);
    }

    /**
     * actually start, must only be used after ready event  
     */ 
    start() {
        this.swapIn();
        this.persistence = startPersistence(this.name);
        this.initializeConfiguration()
            .then(() => {
                this.swapIn();
                this.running = this.running
                    .then((status: PluginStatus) => {
                        // this will run when everything else is done and we are ready for commands
                        this.swapIn();
                        for (let command of this.builtinCommands) {
                            log(`plugin command !${command} ${PluginStatus[status]}`);
                        }
                        for (let command of this.options.commands.value()) {
                            log(`plugin command !${command} (alias for !${this.name}) ${PluginStatus[status]}`);
                        }
                        return status;
                    });
        });
    }

    /**
     * schedule semicolon-separated list of commands
     * 
     * @param input the source of the configuraton commands
     * @param line the entire command line including commands, may not be for this plugin
     * @returns 
     */
    dispatchCommands(input: CommandInput, line: string): void {
        let tokens = ConfigurationParser.tokenizeFirst(line);
        let command = tokens[0].slice(1);
        if (!this.builtinCommands.has(command) && !this.options.commands.value().has(command)) {
            debug.log(`ignoring command for other plugin: ${line.substring(0, 78)}`);
            return;
        }

        // command splitting state is in the regular expression object
        const commandExpression = / *((?:\\;|[^;])+) */g;

        // this is an arbitrary limit on the number of semicolon-separated commands
        // in case a future bug introduces an infinite loop
        const limit = 1000;
        for (let i = 0; i < limit; i++) {
            // find end of command
            let match = commandExpression.exec(tokens[1]);

            // NOTE: regex.exec returns null instead of undefined
            if (match === null) {
                break;
            }

            this.dispatchCommand(input, command, match[1]);
        }
    }

    /**
     * dispatch a single command that is for this plugin
     * 
     * @param input 
     * @param command the !command
     * @param rest the command line, not including the !command
     * @returns 
     */
    private dispatchCommand(input: CommandInput, command: string, rest: string): void {
        // this context object will survive until this command is completely executed
        let context = new PluginParserContext(
            this,
            this.freezeOptions(),
            input,
            command,
            rest);

        // each command may be disallowed by its source
        if (!input.authorize(context.rest)) {
            debug.log(`command was disallowed by command source`);
            return;
        }

        // short circuit dump command for debugging
        if (context.rest === 'dump') {
            this.runCommand(PluginStatus.operational, context)
                .then((_status: PluginStatus) => {
                    // log this directly and don't swap in, things are probably broken
                    console.log(`executed debug dump command for ${this.name} directly`);
                });
            return;
        }

        // run on command queue, which does not execute unless everything else is done
        this.scheduleCommand(context);
    }

    /**
     * read the current configuration provided by the given command source
     * 
     * @param source 
     * @param opaque an opaque handle provided by the caller
     */
    queryCommandSource(source: CommandSource, opaque: any): void {
        let context = new PluginLoaderContext(this, this.freezeOptions());

        // load commands from calling source
        source.query(context, opaque);
    }

    /**
     * to be called from asynchronous handlers to mark current execution as being part of this plugin
     */
    swapIn() {
        console.log = this.consoleLog;
        debug.log = this.debugLog;
    }

    setDebug(enabled: boolean) {
        if (enabled) {
            this.debugLog = this.consoleLog;
        } else {
            this.debugLog = this.ignoreLog;
        }
    }

    /**
     * resets all configuration and recover errors
     * 
     * NOTE: we cannot recreate the plugin from scratch, because it is registered for various Roll20 events
     */
    reset(): void {
        debug.log(`canceling work`);
        this.stopping = true;
        this.running = this.running
            .then((_status: PluginStatus) => {
                // queue is empty of commands now
                this.swapIn();

                // now rebuild the config from defaults and write it to state storage
                console.log('resetting configuration');
                this.defaultConfiguration();
                this.saveConfiguration();

                // debugging is off by default
                console.log('disabling debugging');
                this.setDebug(false);
                this.swapIn();

                // read the configuration back
                return this.restoreConfiguration()
                    .then(this.queryCommandSources)
                    .then(this.reactivatePlugin);
            });
    }

    private queryCommandSources(context: LoaderContext): Promise<void[]> {
        return Promise.all(
            // restore from command sources, but don't attach them a second time
            this.commandSources.map((commandSource) => {
                this.swapIn();
                debug.log(`reading command source ${commandSource.constructor.name}`);
                return commandSource.query(context, undefined)
            })
        )
    }

    private reactivatePlugin(_results: void[]): Promise<PluginStatus> {
        // now allowed to run things again
        this.stopping = false;
        sendChat(this.name, `/w GM ${this.name} has been reset to default configuration`, null, {});
        return Promise.resolve(PluginStatus.operational);
    }
}

/**
 * the plugin public interface that is instantiated in a plugin's main file
 */
export class Plugin<T> {
    // the plugin instance for this plugin
    private plugin: PluginImplementation<T>;

    // set to true if start has been called
    private started: boolean = false;

    // factories for additional sources of commands, in addition to API chat messages
    private commandSources: { factory: CommandSourceFactory, subtrees: string[] }[] = [];

    constructor(pluginName: string, factory: DefaultConstructed<T>) {
        if (typeof log !== 'function') {
            throw new Error(
                'this script includes a module that can only be run in the actual Roll20 environment; please create a separate test script or run in Roll20'
            );
        }
        this.plugin = new PluginImplementation(pluginName, factory);
    }

    /**
     * to be called after 'ready' event from roll20 or otherwise from help generator
     */
    start() {
        try {
            this.plugin.defaultConfiguration();

            // run help generator mode if run that way
            if (typeof der20ScriptMode !== 'undefined' && der20ScriptMode === 'help generator') {
                // help generator mode is called from build system to emit command list as JSON
                let help = new HelpCommand(this.plugin.name, this.plugin.configurationRoot);
                process.stdout.write(JSON.stringify(help.generated(), undefined, 2));
                return;
            }

            // default API chat source for commands
            this.plugin.commandSources.push(new ChatCommandSource(this.plugin.options, this.plugin));

            // additional registered sources for commands
            for (let source of this.commandSources) {
                this.plugin.commandSources.push(new source.factory(this.plugin.options, this.plugin, source.subtrees));
            }

            this.started = true;
            this.plugin.start();
        } catch (error) {
            // report remapped error
            this.plugin.handleErrorThrown(error);

            // disable plugin
            this.plugin.disable();
        }
    }

    /**
     * to be called from asynchronous handlers to mark current execution as being part of this plugin
     */
    swapIn() {
        this.plugin.swapIn();
    }

    /**
     * adds an additional source of configuration information
     */
    addCommandSource(sourceFactory: CommandSourceFactory, legalSubtrees: string[]) {
        if (this.started) {
            throw new Error('command sources must be added before the initial call to Plugin.start()');
        }
        this.commandSources.push({ factory: sourceFactory, subtrees: legalSubtrees });
    }

    /**
     * add default configuration commands to be able to embed them in the script
     */
     addDefaults(commands: string[]): Plugin<T> {
        if (this.started) {
            throw new Error('default configuration must be added before the initial call to Plugin.start()');
        }

        // lazy create the source
        if (!this.commandSources.some((record) => record.factory === DefaultConfigSource)) {
            this.commandSources.push({ factory: DefaultConfigSource, subtrees: undefined });
        }

        // store the config, will actually be sent to all plugins sharing this file, just like when we use chat input
        commands.forEach((line: string) => der20DefaultConfiguration.push(line));
        return this;
    }
}

export class DumpCommand extends ConfigurationSimpleCommand {
    constructor(private plugin: PluginImplementation<any>) {
        super();
    }

    handleEndOfCommand(context: ParserContext): Promise<Result> {
        let dialog = new context.dialog();
        dialog.beginControlGroup();
        for (let line of JSON.stringify(this.plugin.configurationRoot, undefined, 1).split('\n')) {
            dialog.addTextLine(line);
        }
        // XXX report execution status and maybe we could track how many pending commands there are?
        dialog.endControlGroup();
        return new DialogResult(DialogResult.Destination.caller, dialog.render()).resolve();
    }
}

export class ResetCommand extends ConfigurationCommand {
    constructor(private parent: PluginImplementation<any>) {
        super();
    }

    parse(line: string, context: ParserContext): Promise<Result> {
        if (line !== 'all configuration') {
            return new Failure(new Error(`reset command must match 'reset all configuration' exactly`)).resolve();
        }
        // this reset will happen after this command has already finished running, 
        // because ResetCommand is currently "on the stack"
        this.parent.reset();
        return new Change(`requested reset of plugin ${this.parent.name}`).resolve();
    }
}