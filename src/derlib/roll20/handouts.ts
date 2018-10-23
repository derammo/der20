import { ConfigurationBoolean } from "derlib/config/atoms";
import { ConfigurationEventHandler, ConfigurationUpdate, ConfigurationParser } from "derlib/config/parser";
import { Result } from "derlib/config/result";
import { cloneExcept } from "../utility";

// from Roll20
// REVISIT use derlib/rol20/api.d.ts
// REVISIT support mock20?
declare function on(event: 'change:handout', callback: (msg: any) => void): void;
declare function findObjs(properties: { [property: string]: any }, options?: any): any[];

export class HandoutsOptions extends ConfigurationEventHandler {
    journal: ConfigurationBoolean = new ConfigurationBoolean(true);
    archived: ConfigurationBoolean = new ConfigurationBoolean(true);
    
    // list of top-level configuration subtree keys that are allowed to be used in handouts
    // to be set in code
    subtrees: string[] = [];

    toJSON(): any {
        // do not persist subtrees, which are to be set in code
        return { journal: this.journal.toJSON(), archived: this.archived.toJSON() };
    }
}

export class Handouts {
    pluginName: string;
    // cloned configuration at last update
    options: HandoutsOptions;
    subtrees: Record<string, any> = {};

    constructor(pluginName: string, configurationRoot: any, options: HandoutsOptions) {
        this.pluginName = pluginName;
        this.configure(options);

        // don't retain the entire configuration root
        for (let key of options.subtrees) {
            this.addSubtree(key, configurationRoot[key]);
        }

        // install configuration change trigger
        // REVISIT use keyof somehow to always get the right token here
        options.addTrigger('journal', Result.Event.Change, new HandoutsOptionChange(this));
        options.addTrigger('archived', Result.Event.Change, new HandoutsOptionChange(this));    
        
        // start
        this.readHandouts();
        this.hookHandouts();
    }

    // permit a subtree to be reconfigured from handouts
    private addSubtree(key: string, configuration: any) {
        if (key === 'config') {
            // this would allow for infinite loops on handout configuration and other nonsense
            throw new Error('the static configuration subtree cannot be configured from handouts');
        }
        if (configuration === undefined) {
            console.log(`ignoring non-existent configuration subtree '${key}' in handouts`);
            return;
        }
        this.subtrees[key] = configuration;
    }

    configure(options: HandoutsOptions) {
        // REVISIT: could do smart things based on changes to config
        this.options = cloneExcept(HandoutsOptions, options, ['subtrees']);
    }

    // XXX this creates a lot of async reading work and we do not provide any way for the caller to wait until it is finished
    readHandouts() {
        let search: { _type: string, archived?: boolean } = { _type: 'handout' };
        if (this.options.archived.value()) {
            if (this.options.journal.value()) {
                // no restriction
                console.log('configuration will be read from all handouts');
            } else {
                console.log('configuration will be read from archived handouts');
                search.archived = true;
            }
        } else {
            if (this.options.journal.value()) {
                console.log('configuration will be read from handouts listed in the journal');
                search.archived = false;
            } else {
                // nothing supported
                console.log('reading of configuration from handouts is disabled');
                return;
            }
        }
        // console.log(`searching for objects matching ${JSON.stringify(search)}`);
        let handouts = findObjs(search);
        console.log(`scanning ${handouts.length} handouts`);
        for (let handout of handouts) {
            this.readHandout(handout);
        }
    }

    readHandout(handout: any) {
        let target: Handouts = this;
        handout.get('gmnotes', function(text: string) {
            console.log(`scanning handout '${handout.get('name')}'`);
            if (!text.match(/^(<p>)?!/g)) {
                // as long as some plugin command is the first line, we invest the time to read through
                console.log('ignoring handout that does not have a command in the first line of GM Notes');
                return;
            }
            // read text
            let lines;
            if (text.startsWith('<p>')) {
                // formatted into paragraph tags by interactive use
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
                    lines.push(match[1]);
                }
            } else {
                // raw text set by code
                lines = text.split('\n');
            }
            const command = `!${target.pluginName}`;
            for (let line of lines) {
                let tokens = ConfigurationParser.tokenizeFirst(line);
                if (tokens[0] !== command) {
                    // console.log(`ignoring command '${tokens[0]}' for other plugin`);
                    continue;
                }
                target.dispatchCommand(tokens[1]);
            }
        });
    }

    dispatchCommand(line: string) {
        let tokens = ConfigurationParser.tokenizeFirst(line);  
        let subtree = this.subtrees[tokens[0]];
        if (subtree === undefined) {
            const good = Object.keys(this.subtrees).join(', ');
            console.log(`ignoring '!${this.pluginName} ${tokens[0]} in handout, because this plugin only permits [ ${good} ]`);
            return;
        }
        let result = ConfigurationParser.parse(tokens[1], subtree);
        if (result.kind === Result.Kind.Failure) {
            for (let error of (<Result.Failure>result).errors) {
                const limit = 100;
                if (line.length > limit) {
                    console.log(`handout contains command '${line.substring(0, limit)}...' that resulted in error ${error.message}`);
                } else {
                    console.log(`handout contains command '${line}' that resulted in error ${error.message}`);
                }
            }
        }
    }

    hookHandouts() {
        ///
    }    
}

class HandoutsOptionChange extends ConfigurationUpdate.Base {
    constructor(private target: Handouts) {
        super();
        // generated code
    }

    execute(configuration: any, result: Result.Any): Result.Any {
        if (configuration instanceof HandoutsOptions) {
            this.target.configure(configuration);
            // REVISIT: we currently reread all of them even if some were already enabled
            this.target.readHandouts();
            this.target.hookHandouts();
        }
        return new Result.Success();
    }
}
