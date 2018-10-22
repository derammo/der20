// simple loader for AMD style modules included in this file
var derModules;
function define(module_name, requires, start_function) {
    if (derModules === undefined) {
        derModules = {};
    }
    derModules[module_name] = { requires: requires, start_function: start_function };
}
function derModuleStart(module_name) {
    let module = derModules[module_name];
    if (!module) {
        if (typeof require == 'function') {
            // if testing under Node.js, we can use local modules
            module = { requires: [], exports: require(module_name) };
        } else {
            console.log(`        module '${module_name}' is not supported on this platform`);
            module = { requires: [], exports: {} };
        }
        derModules[module_name] = module;
    }
    if (module.exports) {
        // already done
        return;
    }
    if (module.starting) {
        throw new Error(`circular dependency involving ${module_name}`);
    }
    module.starting = true;
    let args = [{}, {}];
    for (let provider of module.requires.slice(2)) {
        try {
            // depth-first traversal, starting modules on which we depend (providers)
            derModuleStart(provider);
        } catch (err) {
            console.log(`circular dependency involving ${module_name}`);
            throw err;
        }
        // exports of provider becomes argument to our start function in same position
        args.push(derModules[provider].exports);
    }
    console.log(`loading module '${module_name}'`);
    module.start_function.apply(null, args);
    module.starting = false;
    if (Object.keys(args[0]).length > 0) {
        throw new Error('unsupported dynamic requirements ' + args[0] + ' from ' + module_name);
    }
    module.exports = args[1];
}
if (derModules !== undefined) {
    for (let module_name of Object.keys(derModules)) {
        derModuleStart(module_name);
    }
}
