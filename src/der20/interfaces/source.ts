import { CommandInput } from "der20/interfaces/config";
import { Options } from "der20/plugin/options";
import { LoaderContext } from "der20/interfaces/loader";

export interface CommandSource {
    /**
     * read all commands from the source and subscribe to changes
     */
    restore(context: LoaderContext): Promise<void>;

    /**
     * selectively read in response to a call to CommandSink.queryCommandSource with the specified opaque context
     */
    query(context: LoaderContext, opaque: any): Promise<void>;
}

export interface CommandSink {
    /**
     * check if the given command line contains commands for the target, and 
     * schedule them for execution if there are any
     */
    dispatchCommands(input: CommandInput, line: string): void;

    /**
     * request callback to source.query
     */
    queryCommandSource(source: CommandSource, opaque: any): void;

    /**
     * to be called from async event handlers to swap in debug context for correct plugin
     */
    swapIn(): void;

    /**
     * report an error that prevented command parsing
     */
    reportParseError(error: Error): void;

    /**
     * report an error that was thrown
     */
    handleErrorThrown(error: Error): void;
}

export interface CommandSourceFactory {
    new(options: Options, plugin: CommandSink, subtrees: string[]): CommandSource;
}