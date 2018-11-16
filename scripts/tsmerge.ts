const fs = require('fs');

let loaded: Record<string, Module> = {};

const sources = process.argv.slice(2);
sources.sort();

let includedModules: Set<string> = new Set<string>(sources);
let externalDependencies: Set<string> = new Set<string>();
let code: string[] = [];

class Module {
    dependencies: string[] = [];
    text: string;
    emitted: boolean = false;
    onStack: boolean = false;

    constructor(public name: string) {
        let emitted: string[] = [];
        const contents = fs.readFileSync(name, { encoding: 'utf8' });
        const lines = contents.split('\n', -1);
        const regex = /^import .* from ['"]([^'"]+)['"];?$/;
        for (let index = 0; index < lines.length; index++) {
            const line = lines[index];
            if (line.trim().length < 1) {
                emitted.push(line);
                continue;
            }
            if (line.startsWith('/')) {
                emitted.push(line);
                continue;
            }
            const match = line.match(regex);
            if (match) {
                let provider: string = `${match[1]}.ts`;
                if (provider[0] === '.') {
                    provider = provider.replace('.', name.slice(0, name.lastIndexOf('/')));
                }
                if (provider.startsWith('der20/')) {
                    provider = `src/${provider}`;
                }
                if (includedModules.has(provider)) {
                    this.dependencies.push(provider);
                } else {
                    externalDependencies.add(line);
                }
            } else {
                const body = lines.slice(index);
                this.text = emitted.concat(body).join('\n');
                break;
            }
        }
    }
}

for (let source of sources) {
    loaded[source] = new Module(source);
}
function emit(module: Module): boolean {
    try {
        if (module.emitted) {
            return true;
        }
        module.onStack = true;
        for (let providerName of module.dependencies) {
            const provider = loaded[providerName];
            if (provider === undefined) {
                throw new Error(`module ${providerName} was not found`);
            }
            if (provider.emitted) {
                // already done
                continue;
            }
            if (provider.onStack) {
                console.error(`cannot resolve module ${module.name} dependency ${provider.name}, which is on stack`);
                return false;
            }
            if (!emit(provider)) {
                console.error(`problem caused by dependecy of ${module.name} on ${provider.name}`);
                return false;
            }
        }
        code.push(`/* =========================================================================\n * ${module.name}\n */`);
        code.push(module.text);
        module.emitted = true;
        module.onStack = false;
        return true;
    } catch (error) {
        console.error(error);
        throw new Error(`error traceback ${module.name}`);
    }
}

for (let source of sources) {
    if (!emit(loaded[source])) {
        process.exit(1);
    }
}

console.log('// tslint:disable:no-shadowed-variable');
let individualDependencies: Set<string> = new Set<string>();
const importExpression = /import {(.*)} from ['"]([^'"]+)['"]/;
for (let line of externalDependencies.values()) {
    const match = line.match(importExpression);
    let symbols = match[1].split(',');
    let provider = match[2];
    // if (provider.startsWith('der20/')) {
    //     provider = 'der20/library';
    // }
    for (let symbol of symbols) {
        const newImport = `import { ${symbol.trim()} } from '${provider}';`
        individualDependencies.add(newImport);
    }
}
let unique = Array.from(individualDependencies.values());
unique.sort();

for (let line of unique) {
    console.log(line);
}
for (let line of code) {
    console.log(line);
}