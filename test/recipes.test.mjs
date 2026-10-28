// Cob 0.0.9 features: recipes (functions), the standard library blocks, automatic `shuck` lines,
// repeatable runs, version gating and the friendly rewrites of the new Cob messages. DOM-free.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gen, genLines, lint, make, clean, minCob, modulesUsed, STDLIB, LIB_FNS, DESKTOP_FNS, MODULE_OF } from '../src/js/blocks.js';
import { EXAMPLES } from '../src/js/examples.js';
import { explain } from '../src/js/errors.js';

const recipe = (a, b, ...body) => make('recipe', { a, b, body });
const serve = a => make('serve', { a }), run = (a, b) => make('run', { a, b });
const COB = process.env.COB_INTERP;
const real = code => { const f = join(mkdtempSync(join(tmpdir(), 'pounce-')), 'p.cob'); writeFileSync(f, code); return spawnSync(COB, [f, '--no-cache'], { encoding: 'utf8' }); };

test('recipe, serve and run blocks write Cob functions', () => {
  const s = [recipe('add', 'a, b', serve('a + b')), recipe('hi', '', make('pop', { a: '"hi"' }), serve('')), make('set', { a: 't', b: 'add(2, 3)' }), run('hi', '')];
  assert.equal(gen(s), 'recipe add(a, b):\n    serve a + b\nrecipe hi():\n    pop("hi")\n    serve\nset t = add(2, 3)\nhi()\n');
  assert.equal(lint(s).length, 0);
});
test('lint: recipe and serve placement, names and inputs', () => {
  const lv = l => lint(l).map(p => p.level + ':' + p.text);
  assert.match(lv([serve('1')])[0], /^error:.*serve block only works inside a recipe/);
  assert.match(lv([make('while', { a: '1', body: [recipe('f', '', serve('1'))] })])[0], /^error:.*sit at the top/);
  assert.match(lv([recipe('f', '', serve('1')), recipe('f', '', serve('2'))]).join('|'), /Two recipes are both called "f"/);
  assert.match(lv([recipe('my name', '', serve('1'))])[0], /can't be the name of a recipe/);
  assert.match(lv([recipe('pop', '', serve('1'))])[0], /already a name Cob uses/);
  assert.match(lv([recipe('kernel_len', 's', serve('1'))])[0], /already a name Cob uses/);
  assert.match(lv([recipe('f', 'a b', serve('1'))])[0], /inputs of a recipe/);
  assert.match(lv([recipe('f', 'a, a', serve('1'))])[0], /same name/);
  assert.match(lv([recipe('f', '')])[0], /nothing inside it/);
  assert.equal(lv([recipe('f', 'a', make('if', { a: 'a > 1', body: [serve('1')] }), serve('0'))]).length, 0); // serve inside an if inside a recipe
});
test('library blocks add the right shuck lines, once, and only for what is used', () => {
  assert.equal(gen([make('lib', { a: 'u', fn: 'kernel_upper', b: '"x"' }), make('lib', { a: 'n', fn: 'kernel_len', b: '"x"' })]),
    'shuck kernels\nset u = kernel_upper("x")\nset n = kernel_len("x")\n');
  assert.equal(gen([make('set', { a: 'n', b: 'ear_max(3, 9) + kernel_len("ab")' })]), 'shuck cornmath\nshuck kernels\nset n = ear_max(3, 9) + kernel_len("ab")\n'); // typed into a plain set box
  assert.equal(gen([make('pop', { a: '"kernel_len( is just text"' }), make('note', { a: 'ear_max( in a comment' })]), 'pop("kernel_len( is just text")\n# ear_max( in a comment\n');
  assert.equal(gen([make('shuck', { a: 'kernels' }), make('lib', { a: 'n', fn: 'kernel_len', b: '"x"' })]), 'shuck kernels\nset n = kernel_len("x")\n'); // own shuck block: no duplicate
  assert.equal(gen([make('pop', { a: '1' })]), 'pop(1)\n');                                                                  // nothing used, nothing added
  assert.deepEqual(modulesUsed(['set a = porch_ask("x")', 'pantry_open(":memory:")']), ['porch', 'pantry']);
  assert.equal(genLines([make('ask')])[0].id, null);                                                                          // generated lines belong to no block
});
test('library tables: every function has one module, blocks only offer what the browser can run', () => {
  assert.equal(Object.keys(MODULE_OF).length, Object.values(STDLIB).reduce((n, d) => n + d.fns.length, 0));
  assert.ok(LIB_FNS.includes('kernel_upper') && LIB_FNS.includes('scatter_rand') && !LIB_FNS.includes('almanac_now') && !LIB_FNS.includes('porch_ask'));
  assert.ok(DESKTOP_FNS.includes('pantry_open') && DESKTOP_FNS.includes('barn_open') && DESKTOP_FNS.includes('tassel_tcl') && !DESKTOP_FNS.includes('kernel_len'));
  assert.equal(gen(clean([{ t: 'lib', fn: 'nope', a: 'x', b: '1' }])), 'shuck ' + MODULE_OF[LIB_FNS[0]] + '\nset x = ' + LIB_FNS[0] + '(1)\n'); // unknown function replaced by a valid one
  assert.equal(clean([{ t: 'call', fn: 'sql_open', a: 'rc', b: '"a.db"' }])[0].fn, DESKTOP_FNS[0]);                          // old 0.0.8 names are not trusted from files
});
test('a run is repeatable: scatter_rand is seeded once per Run, but never overrides the script', () => {
  const dice = [make('lib', { a: 'r', fn: 'scatter_rand', b: '1, 6' })];
  assert.deepEqual(genLines(dice, { seed: 42 }).map(l => l.t), ['shuck cornmath', 'scatter_seed(42)', 'set r = scatter_rand(1, 6)']);
  assert.equal(gen(dice), 'shuck cornmath\nset r = scatter_rand(1, 6)\n');                                                    // the visible code has no seed
  assert.equal(genLines([make('lib', { a: 's', fn: 'scatter_seed', b: '9' }), ...dice], { seed: 42 }).filter(l => /scatter_seed\(42\)/.test(l.t)).length, 0);
  assert.equal(genLines([make('pop', { a: '1' })], { seed: 42 }).length, 1);
});
test('lint warns when a clock call is mixed with questions (replay would change the time)', () => {
  const w = lint([make('ask'), make('set', { a: 't', b: 'almanac_now()' })]).filter(p => /Clock/.test(p.text));
  assert.equal(w.length, 1); assert.equal(w[0].level, 'warn');
  assert.equal(lint([make('set', { a: 't', b: 'almanac_now()' })]).filter(p => /Clock/.test(p.text)).length, 0);
});
test('version gating: blocks that need Cob 0.0.9', () => {
  assert.equal(minCob([make('pop')]), null);
  assert.equal(minCob([make('while', { a: '1', body: [make('ask')] })]), '0.0.9');
  assert.equal(minCob([make('set'), recipe('f', '', serve('1'))]), '0.0.9');
  assert.equal(minCob([make('lib')]), '0.0.9');
});
test('friendly messages for the new Cob errors', () => {
  const e = (t, out = true) => explain(t, out), m = f => f.msg + ' ' + f.hint;
  assert.match(m(e("[cob_interp] error at line 3: recipe 'add' takes 2 arguments but 1 was given")), /needs 2 inputs, but you gave it 1/);
  assert.match(m(e("[cob_interp] error at line 3: recipe 'f' takes 1 argument but 2 were given")), /needs 1 input, but you gave it 2/);
  assert.equal(e("[cob_interp] error at line 3: recipe 'add' takes 2 arguments but 1 was given").line, 3);
  assert.match(m(e("[cob_interp] error at line 2: call to 'nothere', which is not a recipe or a library function")), /doesn't know a recipe called "nothere"/);
  assert.match(m(e("[cob_interp] syntax error at line 1: 'serve' can only be used inside a recipe")), /serve block only works inside a recipe/);
  assert.match(m(e('[cob_interp] syntax error at line 2: a recipe can only be defined at the top level of a program, not inside another block')), /sit at the top/);
  assert.match(m(e('[cob_interp] syntax error at line 1: recipe f needs an indented body')), /nothing inside it/);
  assert.match(m(e("[cob_interp] error at line 5: recipe 'f' is already defined (line 1)")), /Two recipes are both called "f"/);
  assert.match(m(e("[cob_interp] warning: recipe 'down' is nested more than 500 calls deep; call treated as 0")), /more than 500 times/);
  assert.match(m(e("[cob_interp] error at line 1: 'kernel_len' is not defined -- it is in the standard library: add `shuck kernels` at the top")), /kernels library/);
  assert.match(m(e("[cob_interp] error at line 1: 'input' is now porch_ask() in the standard library: add `shuck porch` at the top and call porch_ask(...)")), /new name/);
  assert.equal(e('[porch] warning: porch_ask_int() got non-numeric input "x"; treated as 0').level, 'warn');       // module-tagged lines are recognised
  assert.match(e('[pantry] warning: pantry_exec() failed: near "X": syntax error').msg, /^Cob said:/);               // other module warnings pass through readably
  assert.equal(e('[porch] some other thing'), null);
});
test('the new starter examples exist, lint clean and need Cob 0.0.9', () => {
  const names = EXAMPLES.map(x => x.name);
  for (const n of ['Make your own block (recipe)', 'A recipe that calls itself', 'Shout it (text library)', 'Roll a die (math library)']) assert.ok(names.includes(n), n);
  for (const x of EXAMPLES.filter(x => /recipe|library/.test(x.name))) { const s = x.build(); assert.equal(lint(s).filter(p => p.level === 'error').length, 0, x.name); assert.equal(minCob(s), '0.0.9', x.name); }
});
test('real Cob runs the recipe and library examples', { skip: !COB && 'set COB_INTERP to run' }, () => {
  const out = n => { const x = EXAMPLES.find(e => e.name === n); const r = real(genLines(x.build(), { seed: 5 }).map(l => l.t).join('\n') + '\n'); assert.equal(r.stderr, '', n); assert.equal(r.status, 0, n); return r.stdout; };
  assert.equal(out('Make your own block (recipe)'), '2 + 3 = 5\nHello, Ada!\nHello, Grace!\n');
  assert.match(out('A recipe that calls itself'), /^1! = 1\n2! = 2\n3! = 6\n.*\n8! = 40320\n$/s);
  assert.equal(out('Shout it (text library)'), 'POPCORN!\npopcorn has 7 letters\np0pc0rn\n');
  const dice = out('Roll a die (math library)');
  assert.equal(dice, out('Roll a die (math library)'));                                                                // the same seed gives the same run
  assert.match(dice, /^(Roll \d: [1-6]\n){5}$/);
});
test('real Cob: porch questions work through the generated program', { skip: !COB && 'set COB_INTERP to run' }, () => {
  const f = join(mkdtempSync(join(tmpdir(), 'pounce-')), 'p.cob');
  writeFileSync(f, gen([make('ask', { a: 'n', b: '"Name? "' }), make('asknum', { a: 'a', b: '"Age? "' }), make('set', { a: 'b', b: 'a + 1' }), make('pop', { a: 'n + " " + b' })]));
  const r = spawnSync(COB, [f, '--no-cache'], { input: 'Ada\n41\n', encoding: 'utf8' });
  assert.equal(r.stdout, 'Name? Age? Ada 42\n'); assert.equal(r.stderr, '');
});
