import { ConfigurationContext } from 'der20/interfaces/config';
import { Options } from 'der20/plugin/options';

export interface ContextHost {
    swapIn(): void;
}

export class ContextBase implements ConfigurationContext {
    constructor(private parent: ContextHost, public options: Options) {
        // generated code
    }
    
    swapIn(): void {
        this.parent.swapIn();
    }
}
