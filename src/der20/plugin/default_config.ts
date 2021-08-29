import { CommandInput } from 'der20/interfaces/config';
import { LoaderContext } from 'der20/interfaces/loader';
import { CommandSink, CommandSource } from 'der20/interfaces/source';

// configuration sent to all plugins sharing this file
export const der20DefaultConfiguration: string[] = [];

export class DefaultConfigSource implements CommandSource, CommandInput {
    constructor(_options: any, private sink: CommandSink) {
        // generated code
    }

    kind: CommandInput.Kind = CommandInput.Kind.restore;

    authorize(_rest: string): boolean {
        return true;
    }

    restore(context: LoaderContext): Promise<void> {
        return this.sendConfig(context);
    }

    query(context: LoaderContext, _opaque: any): Promise<void> {
        return this.sendConfig(context);
    }

    private sendConfig(_context: LoaderContext): Promise<void> {
        this.sink.swapIn();
        der20DefaultConfiguration.forEach((line: string) => {
            this.sink.dispatchCommands(this, line);
        });
        return Promise.resolve();
    }
}
