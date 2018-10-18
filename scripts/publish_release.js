const publishRelease = require('publish-release')
const execSync = require('child_process').execSync;
const fs = require('fs');

const token = execSync('security find-internet-password -a derammo -s api.github.com -w', { encoding: 'utf-8' }).trim();
const version = process.argv[2];
const tag = `v${version}`;
const assets = fs.readdirSync(`releases/${version}`).map((name) => {
    return `releases/${version}/${name}`
});
const notes = execSync('git log --date=short --format="##### %h by %an on %ad%n%w(0,4,4)%s%n%n%w(0,4,4)%N%b%n" $(git describe --tags --abbrev=0 HEAD~1)..HEAD', { encoding: 'utf-8' });
console.log(notes);
const releaseSpec = {
    token: token,
    owner: 'derammo',
    repo: 'der20',
    tag: tag,
    name: `der20 Roll20 API Scripts Release ${tag}`,
    notes: "### Changes:\n" + notes,
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

publishRelease(releaseSpec, function (err, release) {
    console.log(release);
})