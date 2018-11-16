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

    load(json: any, context: LoaderContext) {
        this.dictionary = json;
    }

    clear() {
        this.dictionary = {};
    }
}