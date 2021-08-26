import { Result } from "der20/interfaces/result";

// avoid circular dependency by placing this here
export abstract class Validator {
    abstract validate(text: string): Result;

    constructor(public readonly humanReadable: string) {
        // generated
    }
}

// meta information kept in class prototypes to tell configuration parser and help system how to operate
// on the classes from the outside
// 
// in no cases should this information be used to alter the functionality of the class being decorated, since that
// sort of functionality belongs in the source code for the target class
//
export class Der20Meta {
    properties: { [index: string]: Der20Meta.Property } = {}

    // returns meta information for a prototype, or undefined
    static fetch(prototype: any): Der20Meta | undefined {
        return <Der20Meta>prototype._der20_meta;
    }
    
    // creates data on access, use hasProperty to check if property exists to avoid creating information
    static getOrCreateProperty(prototype: any, propertyName: string): Der20Meta.Property {
        let meta = <Der20Meta>prototype._der20_meta;
        if (meta === undefined) {
            meta = new Der20Meta();
            prototype._der20_meta = meta;

            // change to non-enumerable property
            let descriptor = Object.getOwnPropertyDescriptor(prototype, '_der20_meta');
            descriptor.enumerable = false;
            Object.defineProperty(prototype, '_der20_meta', descriptor);
        }
        let property = prototype._der20_meta.properties[propertyName];
        if (property === undefined) {
            property = new Der20Meta.Property();
            prototype._der20_meta.properties[propertyName] = property;
        }
        return property;
    }

    static hasProperty(prototype: any, propertyName: string): boolean {
        if (prototype._der20_meta === undefined) {
            return false;
        }
        if (prototype._der20_meta.properties[propertyName] === undefined) {
            return false;
        }
        return true;
    }
}

// eslint-disable-next-line no-redeclare
export namespace Der20Meta {
    export class Property {
        /**
         * if set, is part of the configuration tree and will be explored 
         * for parsing and help generation
         */
         config: boolean;
         /**
         * if set, validator class to call before setting value
         */
        validation: Validator;
        /**
         * comment string specifying the format of the property
         */
        format: string;
        /**
         * if set, use this keyword instead of the name of the property
         */
        keyword: string;
        /**
         * if set, specifies name of common module to use instead of plugin name when generating help
         */
        common: string;
        /**
         * if set, cannot edit via commands
         */
        data: boolean;
    }
}

export type PropertyDecoratorFunction = (prototype: any, propertyName: string) => void;
