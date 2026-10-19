import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const base = '/adventures-of-pierre/';
const output = resolve(root, 'hosted-dist/adventures-of-pierre');
const releases = resolve(root, 'releases');
const archive = resolve(releases, 'adventures-of-pierre.tar.gz');

const run = (command, args) => {
  const result = spawnSync(command, args, {
    cwd: root, env: { ...process.env, PIERRE_BASE_PATH: base, COPYFILE_DISABLE: '1' }, stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
};

run(process.execPath, [resolve(root, 'node_modules/typescript/bin/tsc'), '-b']);
run(process.execPath, [resolve(root, 'node_modules/vite/bin/vite.js'), 'build', '--outDir', output]);

const index = readFileSync(resolve(output, 'index.html'), 'utf8');
assert(index.includes(`src="${base}assets/`), 'Hosted scripts must use the deployment prefix.');
for (const edition of ['original', 'refresh']) {
  assert.equal(readFileSync(resolve(output, edition, 'index.html'), 'utf8'), index, 'Every edition needs a real static entry page.');
}

mkdirSync(releases, { recursive: true });
run('tar', ['-czf', archive, '-C', resolve(root, 'hosted-dist'), 'adventures-of-pierre']);
const contents = spawnSync('tar', ['-tzf', archive], { encoding: 'utf8' });
assert.equal(contents.status, 0, 'The release archive must be readable.');
assert(!contents.stdout.split('\n').some(path => path.split('/').some(part => part.startsWith('._') || part === '.DS_Store')),
  'The release archive must not contain macOS metadata files.');
const digest = createHash('sha256').update(readFileSync(archive)).digest('hex');
writeFileSync(archive + '.sha256', `${digest}  adventures-of-pierre.tar.gz\n`);
console.log(`\nPrepared ${archive}\nSHA-256: ${digest}\nTarget path: ${base}\nBuild only: nothing has been uploaded or deployed.`);
