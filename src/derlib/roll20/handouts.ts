import { ConfigurationBoolean } from "derlib/config/atoms";
import { ConfigurationEventHandler, ConfigurationUpdate, ConfigurationParser } from "derlib/config/parser";
import { Result } from "derlib/config/result";
import { cloneExcept } from "derlib/utility";

// from Roll20, missing in types file
declare function on(event: 'change:handout', callback: (current: Handout, previous: Handout) => void): void;

export class HandoutsOptions extends ConfigurationEventHandler {
    journal: ConfigurationBoolean = new ConfigurationBoolean(true);
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

export class Handouts {
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
        if (key === this.reservedKey) {
            // this would allow for infinite loops on handout configuration and other nonsense
            throw new Error('the static plugin options subtree cannot be configured from handouts');
        }
        if (configuration === undefined) {
            console.log(`ignoring non-existent configuration subtree '${key}' in handouts`);
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

    // XXX this creates a lot of async reading work and we do not provide any way for the caller to wait until it is finished
    //
    // need something like: plugin.tasks and tasks can be API commands waiting to be executed and asynch work ahead of them, including
    // on startup so we can finish asynch work before doing another command (this would help BeyondImporter also)
    //
    readHandouts() {
        let search: { _type: string, archived?: boolean } = { _type: 'handout' };
        if (this.archived) {
            if (this.journal) {
                // no restriction
                console.log('configuration will be read from all handouts');
            } else {
                console.log('configuration will be read from archived handouts');
                search.archived = true;
            }
        } else {
            if (this.journal) {
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

    // WARNING: the Handout type in api.d.ts is incorrectly claiming gmnotes is a synchronous read property, so we can't use the type here
    readHandout(handout: any) {
        let target: Handouts = this;
        handout.get('gmnotes', (text: string) => {
            console.log(`scanning handout '${handout.get('name')}'`);
            if (!text.match(/^(<p>)?!/g)) {
                // as long as some plugin command is the first line, we invest the time to read through
                console.log('ignoring handout that does not have a command in the first line of GM Notes');
                return;
            }
            // read text
            let lines = Handouts.extractLines(text);
            
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

    static extractLines(text: string): string[] {
        let lines: string[];
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
                const paragraph = match[1];
                // editing in UI will add break tags
                for (let line of paragraph.split('<br>')) {
                    // from https://stackoverflow.com/users/113083/hegemon
                    let cleaned = line.replace(/<\/?("[^"]*"|'[^']*'|[^>])*(>|$)/g, "").trim();
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

    dispatchCommand(line: string) {
        let tokens = ConfigurationParser.tokenizeFirst(line);  
        let subtree = this.subtrees[tokens[0]];
        if (subtree === undefined) {
            const good = Object.keys(this.subtrees).join(', ');
            console.log(`ignoring '!${this.pluginName} ${tokens[0]} in handout, because this plugin only permits [ ${good} ]`);
            return;
        }
        const limit = 100;
        let prefix = line;
        if (line.length > limit) {
            prefix = `${line.substring(0, limit-3)}...`;
        }
        console.log(prefix);
        let result = ConfigurationParser.parse(tokens[1], subtree);
        if (result.kind === Result.Kind.Failure) {
            for (let error of (<Result.Failure>result).errors) {
                console.log(`handout contains command '${prefix}' that resulted in error ${error.message}`);
            }
        }
    }

    handoutChanged(current: Handout, previous: Handout): void {
        let archived = current.get('archived');
        if (archived === undefined) {
            console.log("object received in handout change handler was not a handout");
            return;
        }
        if (archived) {
            if (this.archived) {
                this.readHandout(current);
            }
        } else {
            if (this.journal) {
                this.readHandout(current);
            }
        }
    }

    private hookHandouts() {
        on('change:handout', (current: any, previous: any) => {
            this.handoutChanged(current, previous);
        });    
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
        }
        return new Result.Success('handouts options updated');
    }
}
