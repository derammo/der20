import { ConfigurationStep } from './atoms';
import { Result } from './result';
import { ParserContext, ConfigurationChangeHandling } from './context';
import { PropertyDecoratorFunction, Der20Meta } from './meta';

// keyword to use for this property instead of its name, e.g. singular name for collections
export function keyword(keywordToken: string): PropertyDecoratorFunction {
    return function(prototype: any, propertyName: string): void {
        Der20Meta.getOrCreateProperty(prototype, propertyName).keyword = keywordToken;
    };
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

    static parse(line: string, configuration: any, context: ParserContext): Result.Any {
        debug.log(`parsing "${line}" against ${typeof configuration} ${JSON.stringify(configuration)}`);

        if (configuration instanceof ConfigurationStep) {
            // configuration object implements its own parsing; validation and events
            // were done one frame higher
            return configuration.parse(line, context);
        }

        // try to route keyword
        let result = new Result.Success('no configuration changed');
        const tokens: string[] = ConfigurationParser.tokenizeFirst(line);
        const keywordToken = tokens[0];
        const rest = tokens[1];
        const route = ConfigurationParser.route(keywordToken, configuration);
        if (route === undefined) {
            if (keywordToken.length > 0) {
                return new Result.Failure(new Error(`token '${keywordToken}' did not match any configuration command`));
            }

            // XXX check if 'configuration' has handler to create UI or otherwise handle
            // the end of a configuration command that does not hit a ConfigurationStep

            // empty token was claimed by no item, that is ok
            return result;
        }

        // validation
        let meta = Der20Meta.fetch(configuration.constructor.prototype);
        if (meta !== undefined) {
            let propertyMeta = meta.properties[route.propertyName];
            if (propertyMeta !== undefined) {
                if (propertyMeta.validation !== undefined) {
                    debug.log(`validating input '${rest}'`);
                    result = propertyMeta.validation.validate(rest);
                }
            }
        }

        // execute
        if (result.kind === Result.Kind.Success) {
            result = ConfigurationParser.parse(rest, route.target, context);
        }

        // handle events from child properties
        if (result.events.has(Result.Event.Change)) {
            if (typeof configuration.handleChange === 'function') {
                let target = <ConfigurationChangeHandling>configuration;
                target.handleChange(keywordToken);
            }
        }

        return result;
    }

    // route command to configuration object
    static route(keywordToken: string, configuration: any): { target: any; propertyName: string } | undefined {
        // route property that matches the keyword
        if (configuration.hasOwnProperty(keywordToken)) {
            let target = configuration[keywordToken];
            if (target == null) {
                throw new Error(`property '${keywordToken}' should be an empty configuration object instead of null`);
            }
            return { target: target, propertyName: keywordToken };
        }

        // consult meta info to see if one of the properties claims this keyword even though
        // it does not match the key of the property
        let meta = Der20Meta.fetch(configuration.constructor.prototype);
        if (meta !== undefined) {
            for (let key in meta.properties) {
                if (!meta.properties.hasOwnProperty(key)) {
                    continue;
                }
                if (meta.properties[key].keyword === keywordToken) {
                    return { target: configuration[key], propertyName: key };
                }
            }
        }

        // search for property that has special key word
        // NOTE: we have to support both meta info and class internal support for keyword
        for (let key in configuration) {
            if (!configuration.hasOwnProperty(key)) {
                continue;
            }
            let target = configuration[key];
            if (target != null && target.hasOwnProperty('keyword')) {
                if (target.keyword === keywordToken) {
                    return { target: target, propertyName: key };
                }
            }
        }

        return undefined;
    }
}
