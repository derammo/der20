import { CommandInputImpl } from "der20/config/input";
import { CommandInput } from "der20/interfaces/config";
import { LoaderContext } from "der20/interfaces/loader";
import { CommandSink, CommandSource } from "der20/interfaces/source";
import { ConfigurationParser } from "der20/config/parser";

export class NotesInput extends CommandInputImpl.Base {
    /**
     * if true, the command being enumerated is the first line of the Notes section,
     * which may be relevant to command implementations that need to reset 
     */
    firstLine: boolean = true;

    constructor(kind: CommandInput.Kind, public type: string, public id: string, private subtrees: Set<string>) {
        super(kind);
        // generated code
    }

    authorize(rest: string): boolean {
        const tokens = ConfigurationParser.tokenizeFirst(rest);
        return this.subtrees.has(tokens[0]);
    }
}

export abstract class CommandsFromNotes implements CommandSource {
    // set of top-level configuration subtree keys that are allowed to be configured from notes
    protected subtrees: Set<string>;

    constructor(protected sink: CommandSink, subtrees: string[]) {
        this.subtrees = new Set(subtrees);
    }

    abstract restore(context: LoaderContext): Promise<void>;
    abstract query(context: LoaderContext, opaque: any): Promise<void>;
    
    static extractLines(text: string): string[] {
        let lines: string[] = [];

        // deal with formatting from interactive use
        // consider every text section to be a line
        const sections: string[] = CommandsFromNotes.splitSectionsHTML(text);
        for (let section of sections) {
            if (section === undefined) {
                continue;
            }
            CommandsFromNotes.parseSectionHTML(lines, section);
        }
        return lines;       
    }

    private static parseSectionHTML(lines: string[], section: string): void {
        if (section.length < 1) {
            return;
        }
        for (let line of CommandsFromNotes.splitLines(section)) {
            if (line.length < 1) {
                // don't waste time on empty lines
                continue;
            }
            const cleaned = CommandsFromNotes.cleanHTML(line);
            if (cleaned.length > 0) {
                lines.push(cleaned);
            }
        }        
    }

    private static splitLines(section: string): string[] {
        return section.split('\n');
    }

    private static splitSectionsHTML(text: string): string[] {
        return text.split(/<\/?[a-zA-Z0-9]+(?: style="[^"]*")?>/);
    }

    static cleanHTML(line: string): string {
        return line
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#(\d+);/g, (regexMatch: string, code: string) => { return String.fromCharCode(parseInt(code, 10)); })
            .replace(/&[a-zA-Z0-9]+;/g, ' ') // replace any remaining entities with spaces
            .replace(/  +/g, ' ') // collapse runs of spaces
            .trim();
    }

    protected dispatchLines(text: any, kind: CommandInput.Kind, roll20Type: string, roll20Id: string) {
        let lines = CommandsFromNotes.extractLines(text);
        
        // this source is used only for the first line
        let source = new NotesInput(kind, roll20Type, roll20Id, this.subtrees);
        
        // dispatch is asynchronous, so we need to use a different source object for lines that are not the first
        const source2 = new NotesInput(kind, roll20Type, roll20Id, this.subtrees);
        source2.firstLine = false;

        for (let line of lines) {
            // let plugin figure out if this command is for it
            this.sink.dispatchCommands(source, line);
            source = source2;
        }
    }
}