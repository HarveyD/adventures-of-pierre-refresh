import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '../..');
const manifest = {};
for (const folder of ['Harvey Java', 'Harvey Java 2']) {
  const names = readdirSync(resolve(root, folder), { withFileTypes: true }).filter(item => item.isFile()).map(item => item.name).sort();
  const archived = readdirSync(resolve(root, 'archive', folder), { withFileTypes: true }).filter(item => item.isFile()).map(item => item.name).sort();
  assert.deepEqual(archived, names);
  for (const name of names) {
    const original = readFileSync(resolve(root, folder, name));
    assert(original.equals(readFileSync(resolve(root, 'archive', folder, name))), folder + '/' + name + ' changed');
    manifest[folder + '/' + name] = createHash('sha256').update(original).digest('hex');
  }
}
if (process.argv.includes('--write')) writeFileSync(resolve(root, 'browser/reference/source-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('Verified ' + Object.keys(manifest).length + ' preserved top-level files.');
