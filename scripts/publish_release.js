const publishRelease = require('publish-release');
const execSync = require('child_process').execSync;
const fs = require('fs');

function getHistory(paths) {
    return execSync(
        `git log --date=short --format="##### %h by %an on %ad%n%w(0,4,4)%s%n%n%w(0,4,4)%N%b%n" $(git describe --tags --abbrev=0 HEAD~1)..HEAD -- ${paths}`,
        { encoding: 'utf-8' }
    );
}

const token = execSync('security find-internet-password -a derammo -s api.github.com -w', { encoding: 'utf-8' }).trim();
const version = process.argv[2];
const common = process.argv[3];
const groups = process.argv.slice(4);
const tag = `v${version}`;
const assets = fs.readdirSync(`releases/${version}`).map(name => {
    return `releases/${version}/${name}`;
});
const notes = [];
notes.push(`
## Installation

For each plugin you want to use, download EITHER

* der20_library.js (unless you already have it from another plugin) AND the specific plugin you want to use, such as der20_rewards_plugin.js

OR

* the complete self-contained script, such as der20_rewards_complete.js, which will be a much larger file than the corresponding plugin

Install all *.js files as separate scripts in the Roll20 API Console.  Only install one copy of der20_library.js.  The order of scripts does not matter, but plugins will fail to start until the library is installed.

The command reference for all plugins is at https://derammo.github.io/der20
`);
for (let group of groups) {
    let changes = getHistory(group);
    if (changes.length > 0) {
        notes.push(`### Changes: ${group.replace(/^.*\//g, '')}`);
        notes.push(changes);
    }
}
let commonChanges = getHistory(common);
if (commonChanges.length > 0) {
    notes.push('### Changes: Common');
    notes.push(commonChanges);
}

const releaseSpec = {
    token: token,
    owner: 'derammo',
    repo: 'der20',
    tag: tag,
    name: `der20 Roll20 API Scripts Release ${tag}`,
    notes: notes.join('\n'),
    draft: true,
    prerelease: true,
    reuseRelease: true,
    reuseDraftOnly: true,
    skipAssetsCheck: false,
    skipDuplicatedAssets: false,
    skipIfPublished: false,
    editRelease: false,
    deleteEmptyTag: false,
    assets: assets,
    apiUrl: 'https://api.github.com',
    target_commitish: 'master'
};

publishRelease(releaseSpec, (err, release) => {
    console.log(release);
});
