
    // redirect output to library
    console = console || {};
    console.log = der20_library.consoleOutput;
    debug = debug || {};
    debug.log = der20_library.debugOutput;

    exports.version = 'DER20 DEVELOPMENT BUILD';