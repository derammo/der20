import { ConfigurationStep } from './atoms'
import { Result } from './result';
    
export interface ConfigurationParsing {
    parse(line: string): Result.Any;
}

export class ConfigurationParser {
    // returns first word and rest of line as array
    static tokenizeFirst(line: string) {
        let clean = line.trim();
        let space = clean.indexOf(' ');
        if (space < 0) {
            return [clean, ''];
        }
        return [clean.substr(0, space), clean.substr(space + 1)];
    }

    static parse(line: string, configuration: any): Result.Any {
        let debug = console.debug || console.log;
        debug(`parsing "${line}" against ${typeof configuration} ${JSON.stringify(configuration)}`);
        if (configuration instanceof ConfigurationStep) {
            return configuration.parse(line);
        }
        let tokens = ConfigurationParser.tokenizeFirst(line);
        if (tokens.length < 2) {
            return new Result.Success();
        }
        if (configuration.hasOwnProperty(tokens[0])) {
            let target = configuration[tokens[0]];
            return ConfigurationParser.parse(tokens[1], target);
        }
        // search for property that has special key word
        for (let key in configuration) {
            if (!configuration.hasOwnProperty(key)) {
                continue;
            }
            let item = configuration[key];
            // XXX for some reason instanceof ConfigurationStep returns false for ConfigurationArray<...>
            if ((item != null) && item.hasOwnProperty('keyword')) {
                if (item.keyword == tokens[0]) {
                    return item.parse(tokens[1]);
                }
            }
        }
        if (tokens[0].length > 0) {
            return new Result.Failure(new Error(`token '${tokens[0]}' did not match any configuration command`));
        }
        return new Result.Success();
    }
}
