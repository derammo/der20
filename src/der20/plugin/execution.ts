/** 
 * This object is used to swap in specific global handlers whenever work is 
 * done on a worker thread.  It is specifically used to debug log based 
 * on the plugin, even if the code executing is in the library.
 */
export class ExecutionContext {
    private consoleLog: (message:string) => void;

    private ignoreLog = ((message: string) => {
        // ignore
    });

    private debugLog = this.ignoreLog;

    constructor(name: string) {
        this.consoleLog = (message:string) => {
            let stamp = new Date().toISOString();
            log(`${stamp} ${name}: ${message}`)
        };
    }
    
    setDebug(enabled: boolean) {
        if (enabled) {
            this.debugLog = this.consoleLog;
        } else {
            this.debugLog = this.ignoreLog;
        }
    }

    swapIn() {
        console.log = this.consoleLog;
        debug.log = this.debugLog;
    }
}