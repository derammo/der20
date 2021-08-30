import { Failure, Success } from 'der20/config/result';
import { ConfigurationChangeHandling } from 'der20/interfaces/config';
import { ConfigurationParsing, ConfigurationTermination, ExportContext, ParserContext } from 'der20/interfaces/parser';
import { Result } from 'der20/interfaces/result';
import { Der20Meta } from './meta';
import { Tokenizer } from './tokenizer';

export class ConfigurationParser extends Tokenizer {
    static parse(text: string, configuration: any, context: ParserContext): Promise<Result> {
        // REVISIT this is far too expensive to serialize even when we are not debugging, we need to be able to check the global debug flag to guard this
        // debug.log(`parsing "${line}" with rest "${context.rest}" against ${configuration.constructor.name} ${JSON.stringify(configuration)}`); 
        debug.log(`parsing '${text}' of '${context.rest}' against ${configuration.constructor.name}`); 

        if (text.length === 0) {
            // check if 'configuration' has handler to create UI or otherwise handle
            // the end of a configuration command that does not hit a ConfigurationStep
            const termination = ConfigurationTermination.query(configuration);
            if (termination.supported) {
                debug.log(`dispatching '${text}' of '${context.rest}' as command termination to ${configuration.constructor.name}`); 
                return termination.interface.handleEndOfCommand(context);
            }
        }

        const parsing = ConfigurationParsing.query(configuration);
        if (parsing.supported) {
            // configuration object implements its own parsing
            // validation and events were done one frame higher
            debug.log(`dispatching '${text}' of '${context.rest}' to parser in ${configuration.constructor.name}`); 
            return parsing.interface.parse(text, context);
        }

        // default result
        let result: Result = new Success('no configuration changed');

        // try to route keyword
        const [keywordToken, rest] = ConfigurationParser.tokenizeFirst(text);
        const route = ConfigurationParser.route(keywordToken, configuration);
        if (route === undefined) {
            return ConfigurationParser.handleUnroutable(context, configuration, keywordToken, result);
        }

        // validation
        result = ConfigurationParser.validate(context, configuration, route.propertyName, result);
        if (result.kind !== Result.Kind.success) {
            // denied by validation
            return ConfigurationParser.handleValidationFailure(context, configuration, route.propertyName, result);
        }

        // recursively parse rest of command line
        return ConfigurationParser.parse(rest, route.target, context)
            .then((recursionResult: Result) => {
                context.swapIn();
                return ConfigurationParser.handleEvents(context, configuration, keywordToken, recursionResult);
            });
    }

    private static handleValidationFailure(context: ParserContext, configuration: any, keywordToken: string, result: Result): Promise<Result> {
        debug.log(`input '${context.rest}' failed validation for property '${keywordToken}' at ${configuration.constructor.name}`); 
        return ConfigurationParser.handleEvents(context, configuration, keywordToken, result);
    }

    private static handleUnroutable(context: ParserContext, configuration: any, keywordToken: string, result: Result): Promise<Result> {
        debug.log(`token '${keywordToken}' of '${context.rest}' unroutable at ${configuration.constructor.name}`); 

        if (keywordToken.length > 0) {
            return new Failure(new Error(`token '${keywordToken}' did not match any configuration command`)).resolve();
        }

        // empty token was claimed by no item, that is ok
        return Promise.resolve(result);
    }

    private static validate(configuration: any, propertyName: string, rest: string, result: Result): Result {
        let meta = Der20Meta.fetch(configuration.constructor.prototype);
        if (meta !== undefined) {
            let propertyMeta = meta.properties[propertyName];
            if (propertyMeta !== undefined) {
                if (propertyMeta.validation !== undefined) {
                    debug.log(`validating input '${rest}'`);
                    result = propertyMeta.validation.validate(rest);
                }
            }
        }
        return result;
    }

    private static handleEvents(_context: ParserContext, configuration: any, keywordToken: string, result: Result): Promise<Result> {
        if (result.events.has(Result.Event.change)) {
            const changeHandling = ConfigurationChangeHandling.query(configuration);
            if (changeHandling.supported) {
                debug.log(`parser change event for '${keywordToken}' on '${changeHandling.interface.constructor.name}'`);
                changeHandling.interface.handleChange(keywordToken);
            }
        }
        return result.resolve();
    }

    // route command to configuration object
    static route(keywordToken: string, configuration: any): { target: any; propertyName: string } | undefined {
        let meta = Der20Meta.fetch(configuration.constructor.prototype);

        // route property that matches the keyword
        // if it is part of config tree
        if (ConfigurationParser.isConfiguration(configuration, keywordToken, meta)) {
            let target = configuration[keywordToken];
            if (target == null) {
                throw new Error(`property '${keywordToken}' should be an empty configuration object instead of null`);
            }
            return { target: target, propertyName: keywordToken };
        }

        // consult meta info to see if one of the properties claims this keyword even though
        // it does not match the key of the property
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
        return ConfigurationParser.searchForKeyword(configuration, keywordToken);
    }
    
    private static searchForKeyword(configuration: any, keywordToken: string): { target: any; propertyName: string; } {
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

    private static isConfiguration(configuration: any, keywordToken: string, meta: Der20Meta) {
        return configuration.hasOwnProperty(keywordToken) &&
            meta !== undefined &&
            meta.properties[keywordToken] !== undefined &&
            meta.properties[keywordToken].config;
    }

    static export(configuration: any, context: ExportContext): void {
        if (configuration === undefined) {
            return;
        }

        debug.log(`exporting configuration from ${configuration.constructor.name}`);
        const parsing = ConfigurationParsing.query(configuration);
        if (parsing.supported) {
            // configuration object implements its own parsing
            // validation and events were done one frame higher
            debug.log(`${configuration.constructor.name} supports export function`);
            parsing.interface.export(context);
            return;
        }

        // enumerate keywords
        ConfigurationParser.exportKeys(configuration, context);
    }

    private static exportKeys(configuration: any, context: ExportContext): void {
        const meta = Der20Meta.fetch(configuration.constructor.prototype);
        for (let key of Object.getOwnPropertyNames(configuration)) {
            const child = configuration[key];
            let keywordToken = key;

            if (!ConfigurationParser.isExportableType(configuration, key, child)) {
                continue;
            }

            if (child.hasOwnProperty('keyword')) {
                // keyword override from class
                keywordToken = child.keyword;
            }

            if (meta !== undefined) {
                const property = meta.properties[key];
                if (property !== undefined) {
                    if (!property.config) {
                        debug.log(`${configuration.constructor.name} not exporting data key ${key}`);
                        continue;
                    }
                    if (property.keyword !== undefined) {
                        // keyword override in the meta
                        debug.log(`${configuration.constructor.name} property ${key} has keyword ${property.keyword}`);
                        keywordToken = property.keyword;
                    }
                }
            }

            // export and recurse
            debug.log(`${configuration.constructor.name} exporting keyword ${keywordToken}`);
            context.push(keywordToken);
            ConfigurationParser.export(child, context);
            context.pop();
        }
    }

    private static isExportableType(configuration: any, key: string, child: any) {
        if (typeof child !== 'object') {
            debug.log(`${configuration.constructor.name} not exporting non-object key ${key}`);
            return false;
        }
        if (Array.isArray(child)) {
            debug.log(`${configuration.constructor.name} not exporting array key ${key}`);
            return false;
        }    
        return true;
    }
}
