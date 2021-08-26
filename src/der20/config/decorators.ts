import { PropertyDecoratorFunction, Der20Meta } from './meta';

/**
 * decorator: keyword to use for this property instead of its name, e.g. singular name for collections
 */
export function keyword(keywordToken: string): PropertyDecoratorFunction {
    return function (prototype: any, propertyName: string): void {
        Der20Meta.getOrCreateProperty(prototype, propertyName).keyword = keywordToken;
    };
}

/**
 * decorator: if set, the target property is considered data for save/restore
 */
export function data(prototype: any, propertyName: string): void {
    Der20Meta.getOrCreateProperty(prototype, propertyName).data = true;
}

/**
 * decorator: if set, the target property is considered part of the configuration,
 * for parsing and help generation, and save/restore
 */
export function config(prototype: any, propertyName: string): void {
    Der20Meta.getOrCreateProperty(prototype, propertyName).config = true;
    Der20Meta.getOrCreateProperty(prototype, propertyName).data = true;
}

/**
 * decorator: if set, the target property is not saved or restored but does support configuration commands
 */
export function ephemeral(prototype: any, propertyName: string): void {
    Der20Meta.getOrCreateProperty(prototype, propertyName).config = true;
}
