import { LoaderContext } from 'der20/interfaces/loader';
import { ContextBase } from "./context_base";

export class PluginLoaderContext extends ContextBase implements LoaderContext {
    messages: string[] = [];
    asyncLoads: { promise: Promise<any>; handler: (value: any) => void; }[] = [];

    addMessage(message: string): void {
        this.messages.push(message);
    }

    addAsynchronousLoad<T>(promise: Promise<T>, whenDone: (value: T) => void): void {
        this.asyncLoads.push({ promise: promise, handler: whenDone });
    }
}
