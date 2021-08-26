import { Der20Meta } from './meta';
import { ParserContext, ConfigurationTermination, ConfigurationParsing, ExportContext } from 'der20/interfaces/parser';
import { Result } from 'der20/interfaces/result';
import { Success, Failure } from 'der20/config/result';
import { ConfigurationChangeHandling } from 'der20/interfaces/config';
import { Tokenizer } from './tokenizer';

export class ConfigurationParser extends Tokenizer {
    static parse(text: string, configuration: any, context: ParserContext): Result {
        // REVISIT this is far too expensive to serialize even when we are not debugging, we need to be able to check the global debug flag to guard this
        // debug.log(`parsing "${line}" with rest "${context.rest}" against ${configuration.constructor.name} ${JSON.stringify(configuration)}`); 
        debug.log(`parsing "${text}" with rest "${context.rest}" against ${configuration.constructor.name}`); 

        if (text.length === 0) {
            // check if 'configuration' has handler to create UI or otherwise handle
            // the end of a configuration command that does not hit a ConfigurationStep
            if (typeof configuration.handleEndOfCommand === 'function') {
                let termination = <ConfigurationTermination>configuration;
                return termination.handleEndOfCommand(context);
            }
        }

        if (typeof configuration.parse === 'function') {
            // configuration object implements its own parsing
            // validation and events were done one frame higher
            const parsingObject = <ConfigurationParsing>configuration;
            return parsingObject.parse(text, context);
        }

        // try to route keyword
        let result: Result = new Success('no configuration changed');
        const tokenAndRest: string[] = ConfigurationParser.tokenizeFirst(text);
        const keywordToken = tokenAndRest[0];
        const rest = tokenAndRest[1];
        const route = ConfigurationParser.route(keywordToken, configuration);
        if (route === undefined) {
            if (keywordToken.length > 0) {
                return new Failure(new Error(`token '${keywordToken}' did not match any configuration command`));
            }

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
            context.frames.push({
                route: keywordToken,
                target: route.target
            });
            result = ConfigurationParser.parse(rest, route.target, context);
        }

        // in any case, handle results
        ConfigurationParser.handleEvents(result, configuration, keywordToken);
        return result;
    }

    /**
     * handles events from child properties, called at every level of recursion, as opposed to
     * Plugin.handleParserResult, which is only called at the top level
     *
     * @param result
     * @param configuration
     * @param keywordToken
     */
    private static handleEvents(result: Result, configuration: any, keywordToken: string) {
        if (result.events.has(Result.Event.Change)) {
            if (typeof configuration.handleChange === 'function') {
                let target = <ConfigurationChangeHandling>configuration;
                debug.log(`parser change event for '${keywordToken}' on '${target.constructor.name}'`);
                target.handleChange(keywordToken);
            }
        }
    }

    // route command to configuration object
    static route(keywordToken: string, configuration: any): { target: any; propertyName: string } | undefined {
        let meta = Der20Meta.fetch(configuration.constructor.prototype);

        // route property that matches the keyword
        if (configuration.hasOwnProperty(keywordToken)) {
            // check if this is data-only
            const isOnlyData: boolean = (meta !== undefined) && (meta.properties[keywordToken] !== undefined) && (meta.properties[keywordToken].data);
            if (!isOnlyData) {
                // not marked as data, so we just route to it based on its property name
                let target = configuration[keywordToken];
                if (target == null) {
                    throw new Error(`property '${keywordToken}' should be an empty configuration object instead of null`);
                }
                return { target: target, propertyName: keywordToken };
            }
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

    static export(configuration: any, context: ExportContext): void {
        if (configuration === undefined) {
            return;
        }
        debug.log(`exporting configuration from ${configuration.constructor.name}`);
        if (typeof configuration.export === 'function') {
            // configuration object implements its own parsing
            // validation and events were done one frame higher
            const parsingObject = <ConfigurationParsing>configuration;
            debug.log(`${configuration.constructor.name} supports export function`);
            parsingObject.export(context);
            return;
        }

        // enumerate keywords
        const meta = Der20Meta.fetch(configuration.constructor.prototype);
        for (let key of Object.getOwnPropertyNames(configuration)) {
            const child = configuration[key];
            let keywordToken = key;
            if (typeof child !== 'object') {
                debug.log(`${configuration.constructor.name} not exporting non-object key ${key}`);
                continue;
            }
            if (Array.isArray(child)) {
                debug.log(`${configuration.constructor.name} not exporting array key ${key}`);
                continue;
            }
            if (child.hasOwnProperty('keyword')) {
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
                        debug.log(`${configuration.constructor.name} property ${key} has keyword ${property.keyword}`);
                        keywordToken = property.keyword;
                    }
                }
            }
            debug.log(`${configuration.constructor.name} exporting keyword ${keywordToken}`);
            context.push(keywordToken);
            ConfigurationParser.export(child, context);
            context.pop();
        }
    }
}
