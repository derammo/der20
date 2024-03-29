import { ConfigurationBoolean } from "der20/config/atoms";
import { config } from "der20/config/decorators";
import { ConfigurationChangeDelegator } from "der20/config/change_delegator";
import { common } from "der20/config/help";
import { CommandInput } from "der20/interfaces/config";
import { LoaderContext } from "der20/interfaces/loader";
import { CommandSink } from "der20/interfaces/source";
import { Options } from "der20/plugin/options";
import { CommandsFromNotes } from "./notes_commands";

/**
 * interface to be supported by the plugin options object if plugin wants handouts support
 */
export interface HandoutsSupport {
    handouts: HandoutsOptions;
}

export class HandoutsOptions extends ConfigurationChangeDelegator {
    @common('PLUGIN')
    @config journal: ConfigurationBoolean = new ConfigurationBoolean(true);
    @common('PLUGIN')
    @config archived: ConfigurationBoolean = new ConfigurationBoolean(true);
    
    clone(): HandoutsOptions {
        let clone = new HandoutsOptions();
        
        clone.journal = this.journal.clone();
        clone.archived = this.archived.clone();

        return clone;
    }

    toJSON(): any {
        if (this.journal.hasConfiguredValue() || this.archived.hasConfiguredValue()) {
            // do not persist subtrees, which are to be set in code
            return { journal: this.journal.toJSON(), archived: this.archived.toJSON() };
        } 
        // do not persist if entirely defaulted
        return undefined;
    }
}

export class CommandsFromHandouts extends CommandsFromNotes {
    // stable config from last update
    private journal: boolean;
    private archived: boolean;

    constructor(options: Options, plugin: CommandSink, subtrees: string[]) {
        super(plugin, subtrees);

        if (!options.hasOwnProperty('handouts')) {
            debug.log(`this plugin does not support handout options under '${Options.pluginOptionsKey} handouts'`);
            return;
        }
        const handoutsOptions: any = (<any>options).handouts;
        if (!(handoutsOptions instanceof HandoutsOptions)) {
            debug.log(`this plugin uses non-standard options under '${Options.pluginOptionsKey} handouts' that are unsupported`);
            return;
        }
        this.configure(handoutsOptions);
        if (this.subtrees.has(Options.pluginOptionsKey)) {
            // this would allow for infinite loops on handout configuration and other nonsense
            throw new Error('the static plugin options subtree cannot be configured from handouts');
        }

        // sign up for handouts options reconfigurations
        // REVISIT use keyof somehow to always get the right token here
        handoutsOptions.onChangeEvent((keyword: string) => {
            switch (keyword) {
                case 'archived':
                case 'journal':
                    this.configure(handoutsOptions);
                    this.sink.queryCommandSource(this, undefined);
                    break;
                default:
                    // ignore
            }
            return Promise.resolve();
        });        
    }

    configure(options: HandoutsOptions) {
        // REVISIT: could do smart things based on changes to config
        this.archived = options.archived.value();
        this.journal = options.journal.value();        
    }

    // creates async configuration work
    restore(context: LoaderContext): Promise<void> {
        return Promise.all(this.getHandouts().map(handout => this.readHandout(context, handout)))
            .then((_results: void[]) => {
                context.swapIn();
                // register for changes
                on('change:handout', this.handoutChanged);
                return;
            });
    }        
    
    // creates async configuration work in response to callback
    query(context: LoaderContext, opaque: any): Promise<void> {
        if (opaque === undefined) {
            // read all
            return Promise.all(this.getHandouts().map(handout => this.readHandout(context, handout)))
                .then((_results: void[]) => {
                    // convert to single result
                    return;
                });
        } else {
            // read specific handout
            return this.readHandout(context, opaque);
        }
    }

    handoutChanged(current: Handout, _previous: HandoutImmutableSynchronousGetProperties & HandoutMutableSynchronousGetProperties): void {
        this.sink.swapIn();
        let archived = current.get('archived');
        if (archived === undefined) {
            debug.log('object received in handout change handler was not a handout');
            return;
        }
        if (archived) {
            if (this.archived) {
                this.sink.queryCommandSource(this, current);
            }
        } else {
            if (this.journal) {
                this.sink.queryCommandSource(this, current);
            }
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
    readHandout(context: LoaderContext, handout: any): Promise<void> {
        // check ownership of handout to make sure it is not editable by player, who could be sending us commands
        let controllers = handout.get('controlledby');
        let name = handout.get('name');
        if (controllers !== undefined) {
            if (controllers.length > 0) {
                debug.log(`handout ${name} is controlled by ${controllers} and may therefore not be used for configuration`);
                return Promise.resolve();
            }
        }
        return new Promise<string>((resolve, reject) => {
            handout.get('gmnotes', (text: string) => {
                resolve(text);
            });
        })
        .then(text => {
            context.swapIn();
            debug.log(`scanning handout '${name}'`);
            this.sendHandout(context, handout, text);
        });
    }
    
    private sendHandout(context: LoaderContext, handout: any, text: string): void {
        if (!text.match(/^(<[a-z0-9]+( style="[^"]*")?>)*"?!/g)) {
            // as long as some plugin command is the first line, we invest the time to read through
            debug.log('ignoring handout that does not have a command in the first line of GM Notes');
            debug.log(`ignored GM Notes start with '${text.substring(0,10)}...'`)
            return;
        }
        // send as commands
        this.dispatchLines(text, CommandInput.Kind.journal, 'handout', handout.id);
    }
}