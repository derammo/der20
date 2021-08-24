import { Change, Success, Failure } from './result';
import { ConfigurationCommand } from 'der20/config/atoms';
import { Result } from 'der20/interfaces/result';
import { Collection } from 'der20/interfaces/config';
import { ConfigurationParser } from './parser';
import { ConfigurationString } from './string';

export class ConfigurationPopulateCommand extends ConfigurationCommand {
    constructor(private collection: Collection) {
        super();
        // generated code
    }

    private tryPopulate(item: any, from: Collection): boolean {
        if (item.name === undefined) {
            throw new Error(`populate command requires items with 'name' property of type ConfigurationString`);
        }
        if (!(item.name instanceof ConfigurationString)) {
            throw new Error(`populate command requires items with 'name' property of type ConfigurationString`);
        }
        const query = item.name.value();
        for (let other of from) {
            if (Object.is(other, item)) {
                // don't copy from self
                debug.log(`populate avoiding copy from self, id = '${other.id}'`);
                continue;
            }
            if (other.name === undefined) {
                debug.log(`populate avoiding copy from unnamed item, id = '${other.id}'`);
                continue;
            }
            if (query === other.name.value()) {
                // copy unset items
                for (let key of Object.getOwnPropertyNames(item)) {
                    const property = item[key];
                    if (typeof property.hasConfiguredValue !== 'function') {
                        // not a configuration value
                        debug.log(`populate ignoring non-configurable property '${key}', id = '${other.id}'`);
                        continue;
                    }
                    if (property.hasConfiguredValue()) {
                        // don't overwrite configured things
                        debug.log(`populate ignoring configured property '${key}', id = '${other.id}'`);
                        continue;
                    }
                    const otherProperty = (<any>other)[key];
                    if (otherProperty === undefined) {
                        // key does not exist on source
                        debug.log(`populate ignoring property '${key}' not present on source, id = '${other.id}'`);
                        continue;
                    }       
                    if (otherProperty.current === undefined) {
                        // not a configuration value or unset
                        debug.log(`populate ignoring property '${key}' without current value on source, id = '${other.id}'`);
                        continue;
                    }            
                    debug.log(`populate setting property '${key}' from existing item with id '${other.id}'`);
                    property.current = otherProperty.current; 
                }
                return true;
            }
        }
        return false;
    }

    parse(text: string): Result {
        let tokens = ConfigurationParser.tokenizeFirst(text);
        const item = this.collection.fetchItem(tokens[0]);
        if (item === undefined) {
            return new Failure(new Error(`'${tokens[0]}' is not an item in the collection`));
        }   

        // we expect enough parameters to walk to a child item in a child collection
        // REVISIT: are there any other cases that make sense?
        tokens = ConfigurationParser.tokenizeFirst(tokens[1]);
        const route = ConfigurationParser.route(tokens[0], item);
        if (route === undefined) {
            return new Failure(new Error(`'${tokens[0]}' is not a valid keyword in the specified collection item`));
        }
        const childCollection = route.target;
        if (typeof childCollection.fetchItem !== 'function') {
            return new Failure(new Error(`'${tokens[0]}' is not a child collection in the specified collection item`));
        }
        const childItem = childCollection.fetchItem(tokens[1]);
        if (childItem === undefined) {
            return new Failure(new Error(`'${tokens[1]}' is not a child item under '${tokens[0]}' in the specified collection item`));
        }
        
        // now try to find an item with the same name, first in the same child collection, then in others
        if (this.tryPopulate(childItem, childCollection)) {
            return new Change('populated values from local item with same name');
        }
        for (let other of this.collection) {
            if (Object.is(other, item)) {
                // already checked this one
                continue;
            }
            const otherRoute = ConfigurationParser.route(tokens[0], other);
            if (otherRoute === undefined) {
                continue;
            }
            if (otherRoute.target === undefined) {
                continue;
            }
            if (this.tryPopulate(childItem, otherRoute.target)) {
                return new Change('populated values from item with same name found in another collection');
            }
        }
        return new Success('no other item with same name was found');
    }
}
