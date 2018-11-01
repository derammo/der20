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
for (let group of groups) {
    let changes = getHistory(group);
    if (changes.length > 0) {
        notes.push(`### Changes: ${group.replace(/^.*\//g, '')}`);
        notes.push();
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
