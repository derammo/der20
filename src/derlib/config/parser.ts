import { ConfigurationStep } from './atoms';
import { Result } from './result';
import { ParserContext } from './context';
import { PropertyDecoratorFunction, Der20Meta } from './meta';

// keyword to use for this property instead of its name, e.g. singular name for collections
export function keyword(keywordToken: string): PropertyDecoratorFunction {
    return function(prototype: any, propertyName: string): void {
        Der20Meta.getOrCreateProperty(prototype, propertyName).keyword = keywordToken;
    };
}

export class ConfigurationParser {
    // this string will be substituted for the command currently executed by the caller
    static readonly MAGIC_COMMAND_STRING: string = 'DER20_MAGIC_COMMAND_STRING';

    // this string will be substituted for the currently running plugin's name
    static readonly MAGIC_PLUGIN_STRING: string = 'DER20_MAGIC_PLUGIN_STRING';

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
        if (!result.hasEvents) {
            return result;
        }
        if (configuration instanceof ConfigurationEventHandler) {
            return configuration.handleEvents(keywordToken, context, result);
        }

        return result;
    }

    // determine result, without handling it
    static parseProperty(tokens: string[], target: any, context: ParserContext): Result.Any {
        return ConfigurationParser.parse(tokens[1], target, context);
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

export class ConfigurationEventHandler {
    private handlers: ConfigurationEventHandler.SourceMap = new ConfigurationEventHandler.SourceMap();

    addTrigger(source: string, event: Result.Event, update: ConfigurationUpdate.Base): void {
        let eventMap = this.handlers.get(source);
        eventMap.events[event].push(update);
    }

    handleEvents(source: string, context: ParserContext, result: Result.Any): Result.Any {
        let listeners: ConfigurationEventHandler.EventMap = this.handlers.fetch(source);
        if (listeners === undefined) {
            return result;
        }
        // iterate event types posted on configuration result
        for (let event of result.events) {
            // process all handlers[event] until one changes the result to a failure
            for (let handler of listeners.events[event]) {
                let handlerResult = handler.execute(this, context, result);
                if (handlerResult.kind === Result.Kind.Failure) {
                    return handlerResult;
                }
            }
        }
        return result;
    }
}

export namespace ConfigurationEventHandler {
    export class SourceMap {
        private sources: Record<string, ConfigurationEventHandler.EventMap> = {};

        clone() {
            // share across all clones
            return this;
        }

        toJSON(): any {
            return undefined;
        }

        get(source: string): ConfigurationEventHandler.EventMap {
            let item = this.sources[source];
            if (item === undefined) {
                item = new ConfigurationEventHandler.EventMap();
                this.sources[source] = item;
            }
            return item;
        }

        fetch(source: string) {
            return this.sources[source];
        }
    }

    export class EventMap {
        events: Record<Result.Event, ConfigurationUpdate.Base[]> = { change: [] };
    }
}

export namespace ConfigurationUpdate {
    // WARNING: descendants of this class must not maintain direct references to config objects because
    // these items are shared by all clones of the config subtree
    export abstract class Base {
        abstract execute(configuration: any, context: ParserContext, result: Result.Any): Result.Any;
    }

    export class Default<SOURCE, TARGET> extends Base {
        constructor(private path: string[], private calculator: () => TARGET) {
            super();
        }

        execute(configuration: SOURCE, context: ParserContext, result: Result.Any): Result.Any {
            let value = this.calculator.apply(configuration);
            // XXX can this be made type safe?
            let walk: any = configuration;
            for (let segment of this.path) {
                walk = walk[segment];
            }
            // tslint:disable-next-line:no-string-literal
            walk['default'] = value;
            return result;
        }
    }
}
