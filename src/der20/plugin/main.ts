import { startPersistence } from 'der20/common/persistence';
import { DefaultConstructed, cloneExcept } from 'der20/common/utility';
import { ConfigurationCommand, ConfigurationSimpleCommand } from 'der20/config/atoms';
import { HelpCommand, common } from 'der20/config/help';
import { ConfigurationLoader } from 'der20/config/loader';
import { ConfigurationParser } from 'der20/config/parser';
import { ConfigurationPersistence } from 'der20/config/persistence';
import { Asynchronous, Change, DialogResult, Failure } from 'der20/config/result';
import { CommandSourceImpl } from 'der20/config/source';
import { CommandSource, ConfigurationContext } from 'der20/interfaces/config';
import { LoaderContext } from 'der20/interfaces/loader';
import { ParserContext, ParserFrame } from 'der20/interfaces/parser';
import { Result } from 'der20/interfaces/result';
import { DialogFactory } from 'der20/interfaces/ui';
import { BuiltinConfiguration } from 'der20/plugin/configuration';
import { Options } from 'der20/plugin/options';
import { PromiseQueue } from 'der20/plugin/promise';
import { Der20ChatDialog } from 'der20/roll20/dialog';
import { CommandSourceFactory, ConfigurationCommandSource, CommandSink } from 'der20/interfaces/source';
import { ApiCommandSource, ChatCommandSource } from './chat';
import { ConfigurationExportCommand } from './export';

// from our wrapper
declare var der20ScriptMode: string | undefined;
declare function der20ScriptModules(): any & { name: string; data: any };

// if we add more events, we need to repeat declaration overrides here:
// declare function on(event: "chat:message", callback: (msg: ChatEventData) => void): void;
// declare function on(event: "ready", callback: () => void): void;

class PluginImplementation<T> implements CommandSink {
    // current configuration
    configurationRoot: T & BuiltinConfiguration;

    // current options, either static or from configurationRoot
    options: Options;

    // builtin '!' commands supported by this plugin, additional
    private builtinCommands: Set<string> = new Set();

    // configuration storage
    persistence: ConfigurationPersistence;

    // execution queues for all work done by plugin
    work: PromiseQueue;

    // REVISIT: the reason there are so many levels is because we don't have explicit dependencies
    // between work items.  Because config work is concurrent, there could be several currently running
    // configuration work items (or existing Promises being tracked,) and waiting for them to complete
    // requires scheduling at a lower (NOTE: lower priority is numerically larger) level.  Scheduling at
    // the same level does not enforce ordering, because concurrency is set > 1.
    levels: {
        // async value reads required to retry things
        fetches: PromiseQueue.Level;

        // retries of commands or config that required fetches
        retries: PromiseQueue.Level;

        // configuration reading
        config: PromiseQueue.Level;

        // commands from configuration being parsed, 1 at a time to preserve order
        configparse: PromiseQueue.Level;

        // configuration check, after all reading is done but before any commands are executed
        // NOTE: this level is used to schedule more config work as follow-ups when previous config work is done
        followups: PromiseQueue.Level;

        // API commands
        commands: PromiseQueue.Level;
    } = { fetches: undefined, retries: undefined, config: undefined, configparse: undefined, followups: undefined, commands: undefined };

    // sources of configuration commands
    commandSources: ConfigurationCommandSource[] = [];

    constructor(public name: string, public factory: DefaultConstructed<T>) {
        // generated code

        // create work scheduler and execution context
        this.work = new PromiseQueue(name);

        // report errors to GM
        this.work.errorHandler = (error: Error) => {
            this.handleErrorThrown(error);
        };

        // Configure work priorities, from most urgent to least urgent.  WARNING: do not set concurrency on the commands level to
        // anything greater than 1,because ordering matters at that level.
        this.levels.fetches = this.work.createPriorityLevel({ concurrency: 16, name: 'asynchronous reads' });
        this.levels.retries = this.work.createPriorityLevel({ concurrency: 1, name: 'command retries' });
        this.levels.config = this.work.createPriorityLevel({ concurrency: 16, name: 'configuration' });
        this.levels.configparse = this.work.createPriorityLevel({ concurrency: 1, name: 'configuration parsing' });
        this.levels.followups = this.work.createPriorityLevel({ concurrency: 1, name: 'configuration follow up' });
        this.levels.commands = this.work.createPriorityLevel({ concurrency: 1, name: 'commands' });
    }

    // called when plugin crashed on startup, to make sure it doesn't do things
    disable() {
        this.builtinCommands = new Set();
        this.options = new Options();
    }

    // build the default state of the world, either on start up or to return to default configuration
    defaultConfiguration(resetCommand: ResetCommand) {
        // create the world
        this.configurationRoot = <T & BuiltinConfiguration>new this.factory();

        // built in top-level commands for this plugin
        this.builtinCommands = new Set([this.name]);

        // sanity check to make sure code in Options class matches this
        if (Options.pluginOptionsKey !== 'options') {
            throw new Error(`broken implementation: common options must be stored under key 'options'`);
        }

        // check for common options
        if (this.configurationRoot.options === undefined) {
            // options not supported, so we use fixed configuration
            this.options = new Options();
        } else {
            // options will be configurable
            this.options = this.configurationRoot.options;
            debug.log(`plugin has common options: ${JSON.stringify(this.options)}`);
        }

        // add debug commmand
        if (this.configurationRoot.dump === undefined) {
            this.configurationRoot.dump = new DumpCommand(this);
            common('PLUGIN')(this.configurationRoot.constructor.prototype, 'dump');
        }

        // add change handling for debug flag, since we have to write it to execution context
        this.options.onChangeEvent(keyword => {
            switch (keyword) {
                case 'debug':
                    this.work.context.setDebug(this.options.debug.value());
                    this.work.context.swapIn();
                    break;
                default:
                // ignore
            }
        });

        // add reset command
        if (this.configurationRoot.reset === undefined) {
            this.configurationRoot.reset = resetCommand;
            common('PLUGIN')(this.configurationRoot.constructor.prototype, 'reset');
        }

        // add export command
        if (this.configurationRoot.export === undefined) {
            this.configurationRoot.export = new ConfigurationExportCommand(this.configurationRoot);
            common('PLUGIN')(this.configurationRoot.constructor.prototype, 'export');
        }   

        // add help command
        // WARNING: must be added last, because it enumerates the world when constructed
        if (this.configurationRoot.help === undefined) {
            this.configurationRoot.help = new HelpCommand(this.name, this.configurationRoot);
            common('PLUGIN')(this.configurationRoot.constructor.prototype, 'help');
        }
    }

    restoreConfiguration() {
        let json = this.persistence.load();
        let context = new PluginLoaderContext(this.freezeOptions());

        // we don't use the indirect result based approach we use for parsing,
        // because named promises do not work for loading.  parsing is only considering one path to root at
        // a time, so it is different than loading the entire tree
        ConfigurationLoader.restore(json, this.configurationRoot, context);

        // load commands from all sources
        for (let commandSource of this.commandSources) {
            debug.log(`starting up command source ${commandSource.constructor.name}`);
            commandSource.restore(context);
        }

        // potentially schedule some more commands
        this.handleLoaderResults(context);
    }

    handleParserResult(context: PluginParserContext, result: Result): void {
        // REVISIT make this a debuggable thing, maybe include last few ones in dump?
        debug.log(`parser result: ${JSON.stringify(result)}`);
        if (result.events.has(Result.Event.Change)) {
            debug.log('change event received from command; writing state');
            this.saveConfiguration();
        }

        // echo on last round of execution
        if (
            context.options.echo.value() &&
            result.kind !== Result.Kind.Asynchronous &&
            context.source.kind === CommandSource.Kind.Api
        ) {
            // NOTE: we don't actually use the contents of this dialog; it just provides the direct rendering of the command echo,
            // which is not shown in dialog style
            let echo = new context.dialog();
            let rendered = echo.renderCommandEcho(`!${context.command} ${context.rest}`, result.kind);
            let source = <ApiCommandSource>context.source;
            sendChat(this.name, `/w "${source.player.get('_displayname')}" ${rendered}`, null, { noarchive: true });
        }
        // send any messages to caller, regardless of result
        if (context.options.verbose.value()) {
            for (let message of result.messages) {
                if (context.source.kind === CommandSource.Kind.Api) {
                    let source = <ApiCommandSource>context.source;
                    sendChat(this.name, `/w "${source.player.get('_displayname')}" ${message}`, null, { noarchive: true });
                } else {
                    debug.log(`  ${message}`);
                }
            }
        }

        // this switch must be exhaustive
        // tslint:disable-next-line:switch-default
        switch (result.kind) {
            case Result.Kind.Failure:
                for (let error of (<Failure>result).errors) {
                    this.reportParseError(error);
                }
                break;
            case Result.Kind.Dialog:
                if (context.source.kind !== CommandSource.Kind.Api) {
                    debug.log(`error: dialog generated for non-interactive configuration command '!${context.command} ${context.rest}; ignored`);
                    break;
                }
                let source = <ApiCommandSource>context.source;
                let dialogResult = <DialogResult>result;
                debug.log(`dialog from parse: ${dialogResult.dialog.substr(0, 16)}...`);
                switch (dialogResult.destination) {
                    case DialogResult.Destination.All:
                    case DialogResult.Destination.AllPlayers:
                        sendChat(this.name, `${dialogResult.dialog}`, null);
                        break;
                    case DialogResult.Destination.Caller:
                        sendChat(this.name, `/w "${source.player.get('_displayname')}" ${dialogResult.dialog}`, null, { noarchive: true });
                        break;
                    default:
                        sendChat(this.name, `/w GM ${dialogResult.dialog}`, null, { noarchive: true });
                }
                break;
            case Result.Kind.Success:
                break;
            case Result.Kind.Asynchronous:
                // if asynchronous data is needed, retry once available
                this.scheduleFetches(this.levels.fetches, <Asynchronous>result, context);

                // once all fetches are complete, we can retry the command
                this.work.scheduleWork(this.levels.retries, () => {
                    this.dispatchCommand(context);
                    return Promise.resolve();
                });
                break;
        }
    }

    scheduleFetches(level: PromiseQueue.Level, from: Asynchronous, to: PluginParserContext): void {
        let promisesMap = from.promises;
        // tslint:disable-next-line:forin
        for (let asyncVariable in promisesMap) {
            let handler = (value: any) => {
                to.asyncVariables[asyncVariable] = value;
            };
            this.work.trackPromise(level, promisesMap[asyncVariable], handler);
        }
    }

    saveConfiguration() {
        let text = JSON.stringify(this.configurationRoot);
        // now that everything is clean, convert back to a dictionary
        let cleaned = JSON.parse(text);
        this.persistence.save(cleaned);
    }

    reportParseError(error: Error) {
        debug.log(`error from parse: ${error.message}`);
        sendChat(this.name, `/w GM ${error.message}`, null, { noarchive: true });
    }

    handleLoaderResults(context: PluginLoaderContext) {
        let followUpWork = false;

        // send any messages to log, regardless of result
        for (let message of context.messages) {
            debug.log(message);
        }

        // now that we have loaded all the sync parts without throwing, schedule async loads
        for (let task of context.asyncLoads) {
            followUpWork = true;
            this.work.trackPromise(this.levels.config, task.promise, task.handler);
        }

        // schedule any commands that are ready, but at configparse level
        for (let command of context.commands) {
            followUpWork = true;
            this.work.scheduleWork(this.levels.configparse, () => {
                let parsing = new PluginParserContext(context.options, new CommandSourceImpl.Restore(), `!${this.name}`, command.line);
                parsing.source = command.source;
                this.dispatchCommand(parsing);
                return Promise.resolve();
            });
        }

        // Unlike parser work, we don't retry loader work.  Therefore, we have to
        // check if any of our async follow-up work created more async follow-up work.
        // For example, this happens when we read configuration from an asynchronous
        // source.  The loader work will have async loads, after which it will schedule
        // configuration commands to be run.
        if (followUpWork) {
            debug.log('loader work resulted in additional async follow-ups');

            // don't repeat these messages / work lists
            context.messages = [];
            context.asyncLoads = [];
            context.commands = [];

            // after async work is completed, check for new requests
            this.work.scheduleWork(this.levels.followups, () => {
                debug.log('checking results of follow-up loader work');
                this.handleLoaderResults(context);
                return Promise.resolve();
            });
        }
    }

    // XXX call utility object in another source file
    handleErrorThrown(error: Error, context?: PluginParserContext) {
        let frames = error.stack;
        let bodyText = [];
        if (frames !== undefined) {
            // search for symbols
            let symbols: { line: number; name: string }[] = [];
            for (let loaded of der20ScriptModules()) {
                let symbol = { name: `${loaded.name} ${loaded.data.version || ''}`, line: loaded.data.scriptOffset || 0 };
                symbols.push(symbol);
            }
            symbols.sort((left, right) => {
                return left.line - right.line;
            });

            // use to rewrite stack
            console.log('stack trace (please include in filed bugs):');
            const fileNameAndLine = /apiscript.js:(\d+)/;
            for (let line of frames.split('\n')) {
                let remapped = line;
                const match = line.match(fileNameAndLine);
                if (match && symbols.length > 0) {
                    let name = match[0];
                    let lineNumber = parseInt(match[1], 10);
                    let offset = 0;
                    for (let scan of symbols) {
                        if (scan.line >= lineNumber) {
                            // previous symbol contains it
                            break;
                        }
                        name = scan.name;
                        offset = scan.line;
                    }
                    remapped = line.replace(fileNameAndLine, `${name}:${lineNumber - offset}`);
                }
                console.log(remapped);
                bodyText.push(remapped);
            }
        }
        let dialog = new Der20ChatDialog();
        let titleText = `[${this.name}] error: ${error.message}`;
        dialog.addTitle(`Error from: ${this.name}`);
        dialog.addSubTitle('Stack Trace:');
        dialog.beginControlGroup();
        for (let frame of bodyText) {
            dialog.addTextLine(frame);
        }
        dialog.endControlGroup();
        dialog.addSeparator();
        if (context !== undefined) {
            dialog.addSubTitle('Command Executed:');
            dialog.beginControlGroup();
            let line = `!${context.command} ${context.rest}`;
            titleText = `[${this.name}] error: ${error.message} on: ${line}`;
            bodyText.push(`command executed: ${line}`);
            dialog.addTextLine(line);
            for (let async of Object.keys(context.asyncVariables)) {
                line = `${async}: ${context.asyncVariables[async]}`;
                bodyText.push(line);
                dialog.addTextLine(line);
            }
            dialog.endControlGroup();
            dialog.addSeparator();
        }
        let title = encodeURIComponent(titleText);
        let body = encodeURIComponent(bodyText.join('\n'));
        // REVISIT: have build stamp actual repo used into the dialog generated
        dialog.addExternalLinkButton('File Bug on Github.com', `https://github.com/derammo/der20/issues/new?title=${title}&body=${body}`);
        sendChat(this.name, `/w GM ${dialog.render()}`, null, { noarchive: true });
    }

    // work function called when processing a command, may be asynchronous
    private dispatchCommand(context: PluginParserContext) {
        try {
            let result = ConfigurationParser.parse(context.rest, this.configurationRoot, context);
            this.handleParserResult(context, result);
        } catch (error) {
            this.handleErrorThrown(error, context);
        }
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
    /*
    private freezeOptions(factory: DefaultConstructed<OPTIONS>): OPTIONS {
        if (this.configurationRoot.options === undefined) {
            // options are not configurable, so we don't have to copy them
            return <OPTIONS>(this.options);
        }
        return clone(factory, <OPTIONS>this.options);
    }
    */

    // actually start, must only be used after ready event
    start() {
        this.persistence = startPersistence(this.name);
        this.restoreConfiguration();
        this.work.scheduleWork(this.levels.commands, () => {
            // this will run when everything else is done and we are ready for commands
            for (let command of this.builtinCommands) {
                log(`plugin command !${command} loaded`);
            }
            for (let command of this.options.commands.value()) {
                log(`plugin command !${command} (alias for !${this.name}) loaded`);
            }
            return Promise.resolve();
        });
    }

    dispatchCommands(source: CommandSource, line: string): void {
        let tokens = ConfigurationParser.tokenizeFirst(line);
        let command = tokens[0].slice(1);
        if (!this.builtinCommands.has(command) && !this.options.commands.value().has(command)) {
            debug.log(`ignoring command for other plugin: ${line.substring(0, 78)}`);
            return;
        }
        const commandExpression = / *((?:\\;|[^;])+) */g;
        // this is an arbitrary limit on the number of semicolon-separated commands
        // in case a future bug introduces an infinite loop
        const limit = 1000;
        for (let i = 0; i < limit; i++) {
            let match = commandExpression.exec(tokens[1]);
            // NOTE: regex.exec returns null instead of undefined
            if (match === null) {
                break;
            }
        
            // this context object will survive until this command line is completely executed, including retries
            let context = new PluginParserContext(
                this.freezeOptions(), 
                source, 
                command, 
                match[1]);

            if (!source.authorize(context.rest)) {
                debug.log(`command was disallowed by command source`);
                continue;
            }

            // short circuit dump command for debugging
            if (context.rest === 'dump') {
                this.dispatchCommand(context);
                continue;
            }

            // run on command queue, which does not execute unless everything else is done
            debug.log(`scheduling !${command} ${match[1]}`);
            this.work.scheduleWork(this.levels.commands, () => {
                this.dispatchCommand(context);
                return Promise.resolve();
            });
        }
    }

    queryCommandSource(source: ConfigurationCommandSource, opaque: any): void {
        let context = new PluginLoaderContext(this.freezeOptions());

        // load commands from calling source
        source.query(context, opaque);

        // potentially schedule some commands
        this.handleLoaderResults(context);
    }

    swapIn(): void {
        this.work.context.swapIn();
    }
}

export class Plugin<T> {
    // the plugin instance for this plugin
    private plugin: PluginImplementation<T>;

    // set to true if start has been called
    private started: boolean = false;

    // factories for additional sources of commands, in addition to API chat messages
    private commandSources: { factory: CommandSourceFactory, subtrees: string[] }[] = [ ];

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
            this.plugin.defaultConfiguration(new ResetCommand(this));

            // run help generator mode if run that way
            if (der20ScriptMode === 'help generator') {
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
     * resets all configuration and recover errors
     */
    reset() {
        // we are called from reset command running at lowest priority (command, concurrency 1) so we know there is no work running
        debug.log('canceling work');
        this.plugin.work.cancel();

        // now rebuild the config from defaults and write it to state storage
        debug.log('resetting configuration');
        this.plugin.defaultConfiguration(new ResetCommand(this));
        this.plugin.saveConfiguration();

        // debugging is off by default
        debug.log('disabling debugging');
        this.plugin.work.context.setDebug(false);
        this.plugin.work.context.swapIn();

        // read the configuration to fire any associated change events
        this.plugin.restoreConfiguration();

        // NOTE: we cannot recreate the plugin from scratch, because it is registered for various Roll20 events
    }

    /**
     * adds an additional source of configuration information
     */
    addCommandSource(source: CommandSourceFactory, legalSubtrees: string[]) {
        if (this.started) {
            throw new Error('command sources must be added before the initial call to Plugin.start()');
        }
        this.commandSources.push({ factory: source, subtrees: legalSubtrees });
    }
}

export class DumpCommand extends ConfigurationSimpleCommand {
    constructor(private plugin: PluginImplementation<any>) {
        super();
        // generated code
    }

    handleEndOfCommand(context: ParserContext): Result {
        let dialog = new context.dialog();
        dialog.beginControlGroup();
        for (let line of JSON.stringify(this.plugin.configurationRoot, undefined, 1).split('\n')) {
            dialog.addTextLine(line);
        }
        for (let line of JSON.stringify(this.plugin.work, undefined, 1).split('\n')) {
            dialog.addTextLine(line);
        }
        dialog.endControlGroup();
        return new DialogResult(DialogResult.Destination.Caller, dialog.render());
    }
}

export class ResetCommand extends ConfigurationCommand {
    constructor(private parent: Plugin<any>) {
        super();
        // generated code
    }

    parse(line: string, context: ParserContext): Result {
        if (line !== 'all configuration') {
            return new Failure(new Error(`reset command must match 'reset all configuration' exactly`));
        }
        this.parent.reset();
        return new Change('all stored state and configuration reset');
    }
}

class ContextBase implements ConfigurationContext {
    constructor(public options: Options) {
        // generated code
    }
}

export class PluginLoaderContext extends ContextBase implements LoaderContext {
    messages: string[] = [];
    commands: { source: CommandSource; line: string }[] = [];
    asyncLoads: { promise: Promise<any>; handler: (value: any) => void }[] = [];

    addMessage(message: string): void {
        this.messages.push(message);
    }

    addCommand(source: CommandSource, command: string): void {
        this.commands.push({ source: source, line: command });
    }

    addAsynchronousLoad<T>(promise: Promise<T>, whenDone: (value: T) => void): void {
        this.asyncLoads.push({ promise: promise, handler: whenDone });
    }
}

export class PluginParserContext extends ContextBase implements ParserContext {
    asyncVariables: Record<string, any> = {};
    dialog: DialogFactory = Der20ChatDialog;
    frames: ParserFrame[] = [];

    constructor(options: Options, public source: CommandSource, public command: string, public rest: string) {
        super(options);
        // generated
    }
}
