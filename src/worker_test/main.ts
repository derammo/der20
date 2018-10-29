debug.log = console.log;
import { PromiseQueue } from 'derlib/promise';

function test() {
    let queue = new PromiseQueue();
    let config = queue.createPriorityLevel({ concurrency: 4 });
    let api = queue.createPriorityLevel({ concurrency: 1 });

    // run some configuration that must finish before we take requests
    let promise = new Promise<number>((resolve, reject) => {
        // async load value
        debug.log('doing config work');
        resolve(5);
    });
    let handler = (value: number) => {
        // store it or something
        debug.log('config done handler called');
        debug.log(value);
    };
    queue.trackPromise(config, promise, handler);

    // run a new command that must not execute until configuration is done
    queue.scheduleWork(api, () => {
        // do all the work for one retry of command, then reschedule if we need to
        debug.log('doing command work');
        return Promise.resolve();
    });
}

test();
