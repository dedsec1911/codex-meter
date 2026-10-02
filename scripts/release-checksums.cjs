const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { version } = require('../package.json');
if (process.env.RELEASE_TAG !== `v${version}`) throw new Error('Tag must match package.json version');
const names = [`Codex-Meter-${version}-mac-x64.zip`, `Codex-Meter-${version}-mac-arm64.zip`, `Codex-Meter-${version}-win-x64.exe`];
const checksums = names.map(name => {
  const file = fs.readFileSync(path.join('release', name));
  if (file.length < 1000000) throw new Error(`Unexpectedly small package: ${name}`);
  return `${crypto.createHash('sha256').update(file).digest('hex')}  ${name}`;
});
fs.writeFileSync('release/SHA256SUMS.txt', checksums.join('\n') + '\n');
console.log('Verified three platform packages; wrote SHA256SUMS.txt.');
