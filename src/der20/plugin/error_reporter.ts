import { Dialog } from "der20/interfaces/ui";
import { Der20ChatDialog } from "der20/roll20/dialog";
import { PluginParserContext } from "./parser_context";

/**
 * this function is added to our library via its javascript header
 */
declare function der20ScriptModules(): any & { name: string; data: any };

export class ErrorReporter {
    /**
     * report an error that occurred during command execution
     * 
     * @param error 
     * @param context 
     * @returns a dialog object that can be rendererd and displayed if an interactive channel is available
     */
    static reportError(error: Error, context?: PluginParserContext): Dialog {
        const bodyText: string[] = [];

        if (error.stack === undefined) {
            console.log(`caught error without any stack frames:\n${error}`);
        } else if (typeof der20ScriptModules === 'undefined') {
            ErrorReporter.writeFrames(bodyText, error.stack);
        } else {
            ErrorReporter.rewriteSymbols(bodyText, error.stack);
        }

        let titleText = `[${this.name}] error: ${error.message}`;
        let dialog = new Der20ChatDialog();
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
            dialog.endControlGroup();
            dialog.addSeparator();
        }
        let title = encodeURIComponent(titleText);
        let body = encodeURIComponent(bodyText.join('\n'));
        // REVISIT: have build stamp actual repo used into the dialog generated
        dialog.addExternalLinkButton('File Bug on Github.com', `https://github.com/derammo/der20/issues/new?title=${title}&body=${body}`);
        return dialog;
    }

    private static writeFrames(bodyText: string[], frames: string): void {
        // just don't change the frames
        for (let line of frames.split('\n')) {
            console.log(line);
            bodyText.push(line);
        }
    }

    private static rewriteSymbols(bodyText: string[], frames: string): void {
        // search for symbols
        const symbols: { line: number; name: string }[] = ErrorReporter.loadSymbols();

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

    private static loadSymbols(): { line: number; name: string; }[] {
        const symbols: { line: number; name: string }[] = [];
        for (const loaded of der20ScriptModules()) {
            const symbol = { name: `${loaded.name} ${loaded.data.version || ''}`, line: loaded.data.scriptOffset || 0 };
            symbols.push(symbol);
        }
        symbols.sort((left, right) => {
            return left.line - right.line;
        });
        return symbols;
    }
}