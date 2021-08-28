import { Clearable } from 'der20/library';
import { ConfigurationLoading, LoaderContext } from 'der20/library';

export class PositionData implements ConfigurationLoading, Clearable {
    dictionary: Record<string, { 
        layer: Layer,
        left: number,
        top: number,
        width: number,
        height: number,
        rotation: number
    }> = {};
    
    toJSON(): any {
        return this.dictionary;
    }

    fromJSON(json: any, _context: LoaderContext): Promise<void> {
        this.dictionary = json;
        return Promise.resolve();
    }

    clear() {
        this.dictionary = {};
    }
}