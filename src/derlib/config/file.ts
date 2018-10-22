import { ConfigurationPersistence } from "./persistence";

// may or may not be supported on this platform
import { existsSync, writeFileSync, readFileSync, unlinkSync } from "fs";

export class ConfigurationFile extends ConfigurationPersistence {
    static supported(): boolean {
        return ! [existsSync, writeFileSync, readFileSync, unlinkSync].some((symbol) => {
            return typeof symbol != 'function';
        });
    }

    constructor(private name: string) {
        super();
        // generated code
    }

    load(): object {
        // local testing
        let fileName = `der20_${this.name}_state.json`;
        try {
            if (existsSync(fileName)) {
                let data = readFileSync(fileName);
                return JSON.parse(data.toString());
            }
        } catch (err) {
            console.log(err);
        }
        return {};
    }

    save(configuration: object) {
        let fileName = `der20_${this.name}_state.json`;
        try {
            writeFileSync(fileName, JSON.stringify(configuration));
        } catch (err) {
            console.log(err);
            unlinkSync(fileName);
        }    
    }
}