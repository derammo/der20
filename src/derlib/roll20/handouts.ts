import { ConfigurationBoolean } from "derlib/config/atoms";
import { ConfigurationEventHandler, ConfigurationParser, ConfigurationUpdate } from "derlib/config/parser";
import { ConfigurationSource, LoaderContext, ParserContext } from "derlib/config/context";
import { Options } from "./options";
import { Result } from "derlib/config/result";
import { addExtension, PluginLoaderContext } from "./plugin";
import { common } from "../config/help";

declare function on(event: 'change:handout', callback: (current: Handout, previous: Handout) => void): void;

// mixin to support handouts in Plugin class
class HandoutsPluginExtension {
    handouts: Handouts;
    configurationRoot: any;
    name: string;

    // mixin access to host
    handleLoaderResults: (context: PluginLoaderContext) => void;

    // detect journal reading config in well known location 'options handouts ...'
    configureHandoutsSupport() {
        if (!this.configurationRoot.hasOwnProperty(Options.pluginOptionsKey)) {
            debug.log(`this plugin does not have plugin configuration under '${Options.pluginOptionsKey}'; no handouts support`);
            return;
        }
        const pluginOptions = this.configurationRoot[Options.pluginOptionsKey];
        if (!pluginOptions.hasOwnProperty('handouts')) {
            debug.log(`this plugin does not support handout options under '${Options.pluginOptionsKey} handouts'`);
            return;
        }
        const handoutsOptions: any = pluginOptions.handouts;
        if (!(handoutsOptions instanceof HandoutsOptions)) {
            debug.log(`this plugin uses non-standard options under '${Options.pluginOptionsKey} handouts' that are unsupported`);
            return;
        }
        this.handouts = new Handouts(this.name, this.configurationRoot, handoutsOptions);

        // sign up for handouts options reconfigurations
        // REVISIT use keyof somehow to always get the right token here
        handoutsOptions.addTrigger('journal', Result.Event.Change, new HandoutsOptionChange(this));
        handoutsOptions.addTrigger('archived', Result.Event.Change, new HandoutsOptionChange(this));    

        // read all handouts
        let context = new PluginLoaderContext();
        this.handouts.readHandouts(context);
        this.handleLoaderResults(context);

        // listen for change events on handouts
        this.hookHandouts();
    }

    handoutChanged(current: Handout, previous: Handout): void {
        let context = new PluginLoaderContext();
        let archived = current.get('archived');
        if (archived === undefined) {
            debug.log('object received in handout change handler was not a handout');
            return;
        }
        if (archived) {
            if (this.handouts.archived) {
                this.handouts.readHandout(current, context);
            }
        } else {
            if (this.handouts.journal) {
                this.handouts.readHandout(current, context);
            }
        }
        this.handleLoaderResults(context);
    }

    private hookHandouts() {
        on('change:handout', (current: any, previous: any) => {
            this.handoutChanged(current, previous);
        });
    }    
}


class HandoutsOptionChange extends ConfigurationUpdate.Base {
    constructor(private target: HandoutsPluginExtension) {
        super();
        // generated code
    }

    execute(configuration: any, context: ParserContext, result: Result.Any): Result.Any {
        if (configuration instanceof HandoutsOptions) {
            this.target.handouts.configure(configuration);

            //  we need to get a configuration loader context, so we need to be in the plugin module
            let loaderContext = new PluginLoaderContext();

            // REVISIT: we currently reread all of them even if some were already enabled
            this.target.handouts.readHandouts(loaderContext);

            // fire any resulting commands at configuration level
            this.target.handleLoaderResults(loaderContext);
        }
        return new Result.Success('handouts options updated');
    }
}

export class HandoutsOptions extends ConfigurationEventHandler {
    @common('PLUGIN')
    journal: ConfigurationBoolean = new ConfigurationBoolean(true);
    @common('PLUGIN')
    archived: ConfigurationBoolean = new ConfigurationBoolean(true);
    
    // list of top-level configuration subtree keys that are allowed to be used in handouts
    // to be set in code
    subtrees: string[] = [];

    constructor(public reservedKey: string) {
        super();
        // generated code
    }

    toJSON(): any {
        // do not persist subtrees, which are to be set in code
        return { journal: this.journal.toJSON(), archived: this.archived.toJSON() };
    }
}

class Handouts {
    pluginName: string;
    
    // stable config from last update
    reservedKey: string;
    journal: boolean;
    archived: boolean;
    subtrees: Record<string, any> = {};

    constructor(pluginName: string, configurationRoot: any, options: HandoutsOptions) {
        this.pluginName = pluginName;
        this.configure(options);

        // don't retain the entire configuration root
        for (let key of options.subtrees) {
            this.addSubtree(key, configurationRoot[key]);
        }
    }

    // permit a subtree to be reconfigured from handouts
    private addSubtree(key: string, configuration: any) {
        if (key === this.reservedKey) {
            // this would allow for infinite loops on handout configuration and other nonsense
            throw new Error('the static plugin options subtree cannot be configured from handouts');
        }
        if (configuration === undefined) {
            debug.log(`ignoring non-existent configuration subtree '${key}' in handouts`);
            return;
        }
        this.subtrees[key] = configuration;
    }

    configure(options: HandoutsOptions) {
        // REVISIT: could do smart things based on changes to config
        this.reservedKey = options.reservedKey;
        this.archived = options.archived.value();
        this.journal = options.journal.value();
    }

    // creates async configuration work
    readHandouts(context: LoaderContext) {
        const handouts = this.getHandouts();
        for (let handout of handouts) {
            this.readHandout(handout, context);
        }
    }        
    
    private getHandouts(): Handout[] {
        let search: { _type: string, archived?: boolean } = { _type: 'handout' };
        if (this.archived) {
            if (this.journal) {
                // no restriction
                debug.log('configuration will be read from all handouts');
            } else {
                debug.log('configuration will be read from archived handouts');
                search.archived = true;
            }
        } else {
            if (this.journal) {
                debug.log('configuration will be read from handouts listed in the journal');
                search.archived = false;
            } else {
                // nothing supported
                debug.log('reading of configuration from handouts is disabled');
                return [];
            }
        }
        // debug.log(`searching for objects matching ${JSON.stringify(search)}`);
        let handouts = findObjs(search);
        debug.log(`scanning ${handouts.length} handouts`);
        return handouts.map((object) => {
            if (object === undefined) {
                throw new Error('unexpected undefined handout in result array');
            }
            return <Handout>object;
        });
    }


    // WARNING: the Handout type in api.d.ts is incorrectly claiming gmnotes is a synchronous read property, so we can't use the type here
    readHandout(handout: any, context: LoaderContext) {
        // check ownership of handout to make sure it is not editable by player, who could be sending us commands
        let controllers = handout.get('controlledby');
        let name = handout.get('name');
        if (controllers !== undefined) {
            if (controllers.length > 0) {
                context.addMessage(`handout ${name} is controlled by ${controllers} and may therefore not be used for configuration`);
                return;
            }
        }
        let promise = new Promise<string>((resolve, reject) => {
            handout.get('gmnotes', (text: string) => {
                resolve(text);
            });
        });
        let whenDone = (text: string) => {
            debug.log(`scanning handout '${name}'`);
            if (!text.match(/^(<[a-z0-9]+>)*"?!/g)) {
                // as long as some plugin command is the first line, we invest the time to read through
                debug.log('ignoring handout that does not have a command in the first line of GM Notes');
                debug.log(`ignored handout starts with '${text.substring(0,10)}...'`)
                return;
            }
            // read text
            let lines = Handouts.extractLines(text);
            const command = `!${this.pluginName}`;
            for (let line of lines) {
                let tokens = ConfigurationParser.tokenizeFirst(line);
                if (tokens[0] !== command) {
                    debug.log(`ignoring command '${tokens[0]}' for other plugin`);
                    continue;
                }
                this.dispatchCommand(<Handout>handout, tokens[1], context);
            }
        };
        context.addAsynchronousLoad(promise, whenDone);
    }

    static extractLines(text: string): string[] {
        let lines: string[];
        if (text.startsWith('<')) {
            // formatted by interactive use
            let regex = /<p>(.*?)<\/p>/g;
            lines = [];
            // REVISIT configurable
            let limit = 1000;
            for (let i=0; i<limit; i++) {
                let match = regex.exec(text);
                // NOTE: regex.exec returns null instead of undefined
                if (match === null) {
                    break;
                }
                const paragraph = match[1];
                // editing in UI will add break tags
                for (let line of paragraph.split('<br>')) {
                    let cleaned = line
                        .replace(/<\/?("[^"]*"|'[^']*'|[^>])*(>|$)/g, '') // from https://stackoverflow.com/users/113083/hegemon
                        .replace(/&[a-z]+;/g, ' ') // replace any entities with spaces
                        .replace(/  +/g, ' ') // collapse runs of spaces
                        .trim();
                    let decoded = cleaned.replace(/&#(\d+);/g, (regexMatch: string, code: string) => {
                        return String.fromCharCode(parseInt(code, 10));
                    });
                    lines.push(decoded);
                }
            }
        } else {
            // raw text set by code
            lines = text.split('\n');
        }
        return lines;       
    }

    dispatchCommand(handout: Handout, line: string, context: LoaderContext) {
        let tokens = ConfigurationParser.tokenizeFirst(line);  
        let subtree = this.subtrees[tokens[0]];
        if (subtree === undefined) {
            const good = Object.keys(this.subtrees).join(', ');
            debug.log(`ignoring '!${this.pluginName} ${tokens[0]} in handout, because this plugin only permits [ ${good} ]`);
            return;
        }
        const limit = 100;
        let prefix = line;
        if (line.length > limit) {
            prefix = `${line.substring(0, limit-3)}...`;
        }
        debug.log(prefix);
        const source = new ConfigurationSource.Journal('handout', handout.get('_id'));
        context.addCommand(source, line);
    }
}

// extend Plugin
addExtension(HandoutsPluginExtension);