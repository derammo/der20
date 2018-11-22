import { CommandSource } from "der20/interfaces/config";
import { DialogFactory } from "der20/interfaces/ui";
import { Result } from "der20/interfaces/result";

/**
 * Context passed to any parsing functions for a specific command execution.
 */
export interface ParserContext {
    asyncVariables: Record<string, any>;
    source: CommandSource;
    command: string;
    rest: string;
    dialog: DialogFactory;
}

/**
 * Classes that handle their own parsing implement this.
 */
export interface ConfigurationParsing {
    parse(line: string, context: ParserContext): Result;
}

/**
 * Classes that want to create content if the command line ends 
 * after their keyword implement this.
 * 
 * For example, creating an interactive dialog when no item was selected
 * is done by implementing this.  More commonly, a simple command that
 * does not parse additional tokens after the command may implement this.
 */
export interface ConfigurationTermination {
    handleEndOfCommand(context: ParserContext): Result;
}
