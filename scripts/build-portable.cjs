const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { isPortableArtifact } = require('./artifact-utils.cjs');

const root = path.resolve(__dirname, '..');
const temp = path.join(root, '.build-portable');
const release = path.join(root, 'release');
const builderCli = path.join(root, 'node_modules', 'electron-builder', 'out', 'cli', 'cli.js');

fs.rmSync(temp, { recursive: true, force: true });
const result = spawnSync(process.execPath, [builderCli, '--win', 'portable', '--config.directories.output=.build-portable'], {
  cwd: root,
  stdio: 'inherit',
  shell: false
});

const legacyArtifact = fs.existsSync(temp)
  ? fs.readdirSync(temp).find(name => /^Unia答谢助手-.*-便携版\.exe$/.test(name))
  : null;
const artifact = fs.existsSync(temp)
  ? fs.readdirSync(temp).find(isPortableArtifact) || legacyArtifact
  : null;
if (result.status !== 0 && !artifact) {
  if (result.error) console.error(result.error);
  process.exit(result.status || 1);
}
if (!artifact) throw new Error('便携版构建成功，但未找到最终 EXE');

fs.mkdirSync(release, { recursive: true });
for (const name of fs.readdirSync(release)) {
  if (/^Unia答谢助手-.*-便携版\.exe$/.test(name)) fs.rmSync(path.join(release, name), { force: true });
}
fs.copyFileSync(path.join(temp, artifact), path.join(release, artifact));
fs.rmSync(temp, { recursive: true, force: true });
console.log(`\n最终文件：${path.join(release, artifact)}`);
