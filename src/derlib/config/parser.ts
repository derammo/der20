import { ConfigurationStep } from './atoms'

export class ConfigurationParser {
    // returns first word and rest of line as array
    static tokenizeFirst(line: string) {
        let space = line.indexOf(' ');
        if (space < 0) {
            return [line];
        }
        if (space == (line.length - 1)) {
            return [line];
        }
        return [line.substr(0, space), line.substr(space+1)];
    }

    static parse(line: string, configuration: any) {
        console.log(`parsing "${line}" against ${JSON.stringify(configuration)}`);
        if (configuration instanceof ConfigurationStep) {
            configuration.parse(line);
            return;
        }
        let tokens = ConfigurationParser.tokenizeFirst(line);
        if (tokens.length < 2) {
            return;
        }
        if (configuration.hasOwnProperty(tokens[0])) {
            let target = configuration[tokens[0]];
            ConfigurationParser.parse(tokens[1], target);
            return;
        }
        // search for property that has special key word
        for (let key in configuration) {
            if (!configuration.hasOwnProperty(key)) {
                continue;
            }
            let item = configuration[key];
            // XXX for some reason instanceof ConfigurationStep returns false for ConfigurationArray<...>
            if (item.hasOwnProperty('keyword')) {
                if (item.keyword == tokens[0]) {
                    item.parse(tokens[1]);
                }
            }
        }
    }
}
