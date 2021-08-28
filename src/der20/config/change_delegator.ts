import { ConfigurationChangeDelegation, ConfigurationChangeHandling } from "der20/interfaces/config";

/**
 * this class does not handle its own change events, but instead forwards them to a registered handler function
 */
export class ConfigurationChangeDelegator implements ConfigurationChangeDelegation, ConfigurationChangeHandling {
    private changeEventHandler: (keyword: string) => Promise<void>;

    onChangeEvent(handler: (keyword: string) => Promise<void>): void {
        if (this.changeEventHandler !== undefined) {
            throw new Error('Logic error: change event delegation handler already registered.');
        }
        this.changeEventHandler = handler;
    }   

    handleChange(keyword: string): Promise<void> {
        if (this.changeEventHandler !== undefined) {
            return this.changeEventHandler(keyword);
        }
        return Promise.resolve();
    }
}