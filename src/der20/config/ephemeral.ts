import { ConfigurationPersistence } from "./persistence";

export class ConfigurationTemp extends ConfigurationPersistence {
    static supported(): boolean {
        return true;
    }

    constructor() {
        super();
        // generated code
    }

    load(): object {
        return {};
    }

    save(configuration: object) {
        // ignore
    }
}