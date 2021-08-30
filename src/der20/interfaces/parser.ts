import { CommandInput, ConfigurationContext, interfaceQuery } from "der20/interfaces/config";
import { DialogFactory } from "der20/interfaces/ui";
import { Result } from "der20/interfaces/result";

/**
 * A 'stack frame' in the parsing process, frequently  corresponding to one token each
 */
export interface ParserFrame {
    route: string;
    target: any;
}

/**
 * Context passed to any parsing functions for a specific command execution.
 */
export interface ParserContext extends ConfigurationContext {
    input: CommandInput;

    command: string;
    
    /**
     * the currently processed command line, not including the !command that was matched
     */
    rest: string;

    dialog: DialogFactory;
}


/**
 * Context for enumeration of all currently active configuration commands
 */
export interface ExportContext extends ConfigurationContext {
    push(token: string): void;
    pop(): string;
    prefix(): string;
    addCommand(line: string): void;
    addRelativeCommand(rest: string): void;
}

/**
 * Classes that handle their own parsing implement this.
 */
export interface ConfigurationParsing {
    /**
     * attempt to parse the input
     * 
     * @param text the input to be parsed, including tokens for this configuration step and any subsequent steps, to the end of the input line
     * @param context 
     */
    parse(text: string, context: ParserContext): Promise<Result>;
    export(context: ExportContext): void;
}

// eslint-disable-next-line no-redeclare
export namespace ConfigurationParsing {
    export function query(target: any) {
        return interfaceQuery<ConfigurationParsing>(target, ['parse', 'export']);
    } 
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
    handleEndOfCommand(context: ParserContext): Promise<Result>;
}

// eslint-disable-next-line no-redeclare
export namespace ConfigurationTermination {
    export function query(target: any) {
        return interfaceQuery<ConfigurationTermination>(target, ['handleEndOfCommand']);
    } 
}
