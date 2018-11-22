import { CommandSourceImpl } from "der20/config/source";
import { CommandSource } from "der20/interfaces/config";
import { LoaderContext } from "der20/interfaces/loader";
import { CommandSink, ConfigurationCommandSource } from "der20/interfaces/source";
import { ConfigurationParser } from "der20/config/parser";

export class NotesSource extends CommandSourceImpl.Base {
    /**
     * if true, the command being enumerated is the first line of the Notes section,
     * which may be relevant to command implementations that need to reset 
     */
    firstLine: boolean = true;

    constructor(kind: CommandSource.Kind, public type: string, public id: string, private subtrees: Set<string>) {
        super(kind);
        // generated code
    }

    authorize(rest: string): boolean {
        const tokens = ConfigurationParser.tokenizeFirst(rest);
        return this.subtrees.has(tokens[0]);
    }
}

export abstract class CommandsFromNotes implements ConfigurationCommandSource {
    // interface to our host
    protected plugin: CommandSink;

    // set of top-level configuration subtree keys that are allowed to be configured from notes
    protected subtrees: Set<string>;

    constructor(plugin: CommandSink, subtrees: string[]) {
        this.plugin = plugin;
        this.subtrees = new Set(subtrees);
    }

    abstract restore(context: LoaderContext): void;
    abstract query(context: LoaderContext, opaque: any): void;
    
    static extractLines(text: string): string[] {
        let lines: string[];
        if (text.startsWith('<')) {
            // formatted by interactive use
            let regex = /<p>(.*?)<\/p>/g;
            lines = [];
            // REVISIT configurable
            let limit = 1000;
            for (let i=0; i<limit; i++) {
                let match = regex.exec(text);
                // NOTE: regex.exec returns null instead of undefined
                if (match === null) {
                    break;
                }
                const paragraph = match[1];
                // editing in UI will add break tags
                for (let line of paragraph.split('<br>')) {
                    let cleaned = line
                        .replace(/<\/?[a-zA-Z0-9]+(>|$)/g, '') // remove common tags with alphanumeric names
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&[a-z]+;/g, ' ') // replace any remaining entities with spaces
                        .replace(/  +/g, ' ') // collapse runs of spaces
                        .trim();
                    let decoded = cleaned.replace(/&#(\d+);/g, (regexMatch: string, code: string) => {
                        return String.fromCharCode(parseInt(code, 10));
                    });
                    lines.push(decoded);
                }
            }
        } else {
            // raw text set by code
            lines = text.split('\n');
        }
        return lines;       
    }

    protected dispatchLines(text: any, kind: CommandSource.Kind, roll20Type: string, roll20Id: string) {
        let lines = CommandsFromNotes.extractLines(text);
        let source = new NotesSource(kind, roll20Type, roll20Id, this.subtrees);
        const source2 = new NotesSource(kind, roll20Type, roll20Id, this.subtrees);
        source2.firstLine = false;
        for (let line of lines) {
            // let plugin figure out if this command is for it
            this.plugin.dispatchCommands(source, line);
            // dispatch is asynchronous, so we need to use a different source object for lines that are not the first
            source = source2;
        }
    }
}