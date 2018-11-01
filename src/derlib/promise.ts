class Task<T> {
    // if set this represents async work we already started, otherwise it will be created via work function
    promise: Promise<T>;

    // if set, is called when the task is allowed to run, must return a promise to wait for the result
    work: PromiseQueue.Work<T>;

    // called when the promise is resolved to handle any result
    handler: PromiseQueue.Handler<T>;
}

class Priority {
    name: string = 'unnamed queue';
    concurrency: number = 1;
    running: number = 0;
    limit: number = 1024;
    waiting: Task<any>[] = [];
}

export class PromiseQueue {
    private levels: Priority[] = [];

    createPriorityLevel(options?: { concurrency?: number, name?: string }): PromiseQueue.Level {
        let queue = new Priority();
        if (options !== undefined) {
            Object.assign(queue, options);
        }
        this.levels.push(queue);
        return this.levels.length - 1;
    }

    scheduleWork<T>(priority: PromiseQueue.Level, work: PromiseQueue.Work<T>, handler?: PromiseQueue.Handler<T>) {
        let task = new Task<T>();
        task.work = work;
        task.handler = handler;
        this.schedule(priority, task);
    }

    // NOTE: we already have the promise from some other API so it is actually already running, but 
    // we don't consider it as running until we wait for its result and we run its handler
    // within the concurrency limit 
    trackPromise<T>(priority: PromiseQueue.Level, promise: Promise<T>, handler?: PromiseQueue.Handler<T>) {
        let task = new Task<T>();
        task.promise = promise;
        task.handler = handler;
        this.schedule(priority, task);
    }

    // cancel all outstanding work, leaving current work running
    cancel() {
        for (let queue of this.levels) {
            queue.waiting = [];
        }
    }

    private schedule(priority: PromiseQueue.Level, task: Task<any>) {
        let queue = this.levels[priority];
        if (this.mayRun(priority)) {
            debug.log(`scheduler debug: immediately executing task of level '${queue.name}'`);
            this.run(queue, task);
        } else {
            if (queue.waiting.length >= queue.limit) {
                throw new Error(`queue limit of ${queue.limit} for queue ${queue.name} was exceeded; system may be deadlocked`);
            }
            debug.log(`scheduler debug: scheduling task on queue '${queue.name}'`);
            queue.waiting.push(task);
        }
    }

    private run(queue: Priority, task: Task<any>) {
        queue.running++;
        if (task.promise === undefined) {
            if (task.work === undefined) {
                throw new Error('work function must be specified for task that does not already have a promise attached');
            }
            debug.log(`scheduler debug: executing work from queue '${queue.name}'`);
            try {
                task.promise = task.work();
            } catch (err) {
                console.log(`error caught from work function: ${err.message}`);
                task.promise = Promise.reject(err.message);
            }
        }
        task.promise
            .then(value => {
                if (task.handler !== undefined) {
                    debug.log(`scheduler debug: calling result handler for task from queue '${queue.name}'`);
                    task.handler(value);
                }
            })
            .catch((reason) => {
                debug.log(`scheduler debug: failed work on queue '${queue.name}'`);
            })
            .then(() => {
                queue.running--;
                this.update();
            });
    }

    private mayRun(priority: PromiseQueue.Level) {
        let queue = this.levels[priority];
        if (queue.running >= queue.concurrency) {
            // this queue is executing at limit
            return false;
        }
        for (let scan = priority - 1; scan >= 0; scan--) {
            if (this.levels[scan].running > 0) {
                // can't execute ahead of more urgent work
                return false;
            }
            if (this.levels[scan].waiting.length > 0) {
                // there must be even more urgent work keeping these waiting
                return false;
            }
        }
        return true;
    }

    // find one item to run, if there is one
    private update() {
        for (let queue of this.levels) {
            if (queue.waiting.length + queue.running === 0) {
                // nothing at this level, allowed to check next level
                continue;
            }
            if (queue.running >= queue.concurrency) {
                // this level is executing at limit, so nothing may execute
                return;
            }
            if (queue.waiting.length === 0) {
                // nothing new to run, but we have tasks running at this level, so nothing may execute
                return;
            }
            this.run(queue, queue.waiting.pop());
            return;
        }
    }
}

export namespace PromiseQueue {
    export type Work<T> = () => Promise<T>;
    export type Handler<T> = (value: T) => void;
    export type Level = number;
}
