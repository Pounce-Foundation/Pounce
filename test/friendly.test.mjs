import test from 'node:test';
import assert from 'node:assert/strict';
import { explain } from '../src/js/errors.js';
import { genLines, lint, make, gen } from '../src/js/blocks.js';
import { EXAMPLES } from '../src/js/examples.js';
test('explains real Cob messages', () => {
  const a = explain('[cob_interp] syntax error at line 4: malformed condition in while statement');
  assert.equal(a.level, 'error'); assert.equal(a.line, 4); assert.match(a.msg, /question in your while/);
  const b = explain("[cob_interp] warning: undefined variable 'scor', treated as 0");
  assert.equal(b.level, 'warn'); assert.match(b.msg, /scor/); assert.match(b.hint, /set scor = 0/);
  assert.match(explain('[cob_interp] warning: while loop hit the 10000000-iteration safety cap, stopping it early').msg, /ten million/);
  assert.match(explain('[cob_interp] syntax error at line 2: unrecognized statement: foo bar').msg, /foo bar/);
  assert.match(explain('COB Warning: sql_open is bypassed in the web sandbox', false).msg, /desktop version/);
  assert.equal(explain('[cob_interp] warning: sql_open() is a stub in this build', true).level, 'warn');
  assert.match(explain('[cob_interp] error: something new').msg, /^Cob said: something new/);
});
test('program output is never treated as an error', () => {
  assert.equal(explain('Hello, World!'), null); assert.equal(explain('[cob_interp] error: x', false), null);
});
test('lines map back to blocks', () => {
  const w = make('while', { a: 'n > 0' }); w.body = [make('pop', { a: 'n' })];
  const l = genLines([make('set', { a: 'n', b: '3' }), w]);
  assert.deepEqual(l.map(x => x.t), ['set n = 3', 'while n > 0:', '    pop(n)']); assert.equal(l[2].id, w.body[0].id); assert.equal(l[1].id, w.id);
});
test('lint catches kid mistakes', () => {
  assert.equal(lint([make('pop', { a: '"Hi' })])[0].level, 'error');
  assert.equal(lint([make('pop', { a: '' })])[0].level, 'error');
  assert.equal(lint([make('pop', { a: '"say \\"hi\\""' })]).length, 0);
  assert.equal(lint([make('set', { a: 'my score', b: '1' })])[0].level, 'warn');
  assert.equal(lint([make('while', { a: 'x < 1' })])[0].level, 'warn');
});
test('every starter example is clean', () => {
  for (const e of EXAMPLES) { const s = e.build(); assert.ok(gen(s).length > 0, e.name); assert.equal(lint(s).filter(p => p.level === 'error').length, 0, e.name); }
});
