// Optional end-to-end check: runs every starter example through a real cob_interp.
// Skipped unless COB_INTERP points at a built Cob 0.0.7+ binary, e.g.
//   COB_INTERP=/path/to/Cob/bin/cob_interp npm test
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gen, make } from '../src/js/blocks.js';
import { EXAMPLES } from '../src/js/examples.js';
const COB = process.env.COB_INTERP;
const run = code => {
  const f = join(mkdtempSync(join(tmpdir(), 'pounce-')), 'p.cob'); writeFileSync(f, code);
  return spawnSync(COB, [f, '--no-cache'], { encoding: 'utf8' });
};
test('every starter example runs cleanly in real Cob', { skip: !COB && 'set COB_INTERP to run' }, () => {
  for (const e of EXAMPLES) { const r = run(gen(e.build())); assert.equal(r.status, 0, e.name); assert.equal(r.stderr, '', e.name); assert.ok(r.stdout.length > 0, e.name); }
});
test('if / else if / else pick the right branch in real Cob', { skip: !COB && 'set COB_INTERP to run' }, () => {
  const chain = n => [make('set', { a: 'n', b: String(n) }),
    make('if', { a: 'n > 10', body: [make('pop', { a: '"big"' })] }),
    make('elif', { a: 'n > 5', body: [make('pop', { a: '"medium"' })] }),
    make('else', { body: [make('pop', { a: '"small"' })] })];
  assert.equal(run(gen(chain(20))).stdout, 'big\n');
  assert.equal(run(gen(chain(7))).stdout, 'medium\n');
  assert.equal(run(gen(chain(1))).stdout, 'small\n');
});
