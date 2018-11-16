
    // debug.log output function, discards output by default
    // but will be switched to console log if debug is enabled at 
    // run time
    debug = {
        log: ((message) => {
            // ignore
        })
    };

    // we need to add this if running on roll20
    console = { 
        log: ((message) => {
            let stamp = new Date().toISOString();
            log(`${stamp} der20: ${message}`)
        })
    };

    exports.version = 'DER20 DEVELOPMENT BUILD';