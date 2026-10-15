import test from 'node:test';
import assert from 'node:assert/strict';
import { gen, sample, make, usesNoGC, clean } from '../src/js/blocks.js';
import { writeZip, readZip } from '../src/js/zip.js';
import { saveProject, loadProject } from '../src/js/project.js';
test('codegen matches Cob syntax', () => {
  assert.equal(gen(sample()), '# Pounce example\npop("Hello, World!")\nset count = 0\nwhile count < 5:\n    pop("Harvesting... " + count)\n    set count = count + 1\n');
});
test('zip round trip', async () => {
  const z = await readZip(await writeZip({ 'a.txt': 'héllo', 'd/b.bin': new Uint8Array([1, 2, 3]) }).arrayBuffer());
  assert.equal(new TextDecoder().decode(z['a.txt']), 'héllo'); assert.deepEqual([...z['d/b.bin']], [1, 2, 3]);
});
test('project round trip + sanitising', async () => {
  const s = { title: 'T', script: sample(), modules: { greeter: 'pop("hi")' } };
  const p = await loadProject(await saveProject(s, '0.0.6').arrayBuffer());
  assert.equal(gen(p.script), gen(s.script)); assert.equal(p.modules.greeter, 'pop("hi")'); assert.equal(p.title, 'T');
  assert.equal(gen(clean([{ t: 'pop', a: 'x\npop("evil")' }, { t: 'nope' }])), 'pop(x pop("evil"))\n');
  await assert.rejects(loadProject(await writeZip({ 'project.json': '{"format":"x"}' }).arrayBuffer()));
});
test('no-gc detection', () => { assert.ok(usesNoGC([make('while', { a: '1' }), make('harvest')]) && !usesNoGC(sample())); });
