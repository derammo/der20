import { ConfigurationChangeDelegation, ConfigurationChangeHandling } from "der20/interfaces/config";

/**
 *  this class does not handle its own change events, but instead forwards them to a registered handler function
 */
export class ConfigurationChangeDelegator implements ConfigurationChangeDelegation, ConfigurationChangeHandling {
    private changeEventHandler: (keyword: string) => void;

    onChangeEvent(handler: (keyword: string) => void): void {
        if (this.changeEventHandler !== undefined) {
            throw new Error('Logic error: change event delegation handler already registered.');
        }
        this.changeEventHandler = handler;
    }   

    handleChange(keyword: string): void {
        if (this.changeEventHandler !== undefined) {
            this.changeEventHandler(keyword);
        }
    }
}