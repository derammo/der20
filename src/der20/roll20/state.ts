import { ConfigurationPersistence } from 'der20/config/persistence'

// REVISIT: dirty flags and links back in the configuration tree to only write modified subtree
export class ConfigurationState extends ConfigurationPersistence {
    static supported(): boolean {
        return (typeof state === 'object');
    }

    constructor(private name: string) {
        super();
        // generated code
    }

    load(): object {
        state.der20 = state.der20 || {};
		state.der20[this.name] = state.der20[this.name] || {};
        return state.der20[this.name];
    }

    save(configuration: object) {
        state.der20 = state.der20 || {};
        state.der20[this.name] = configuration;
    }
}