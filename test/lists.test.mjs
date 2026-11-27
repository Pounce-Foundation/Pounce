// Lists (bushel) and arrays (furrow), Cob 0.0.10: blocks, automatic shuck lines, version gating, friendly errors.
import test from 'node:test';
import assert from 'node:assert/strict';
import { gen, genLines, lint, make, clean, minCob, listSyntax, boolSyntax, trailingComment, modulesUsed, STDLIB, LIB_FNS, DESKTOP_FNS, MODULE_OF, BLOCKS, CATS } from '../src/js/blocks.js';
import { explain } from '../src/js/errors.js';
import { EXAMPLES } from '../src/js/examples.js';

test('Tcl/Tk is gone and the new modules are browser modules', () => {
  assert.ok(!('tassel' in STDLIB) && !MODULE_OF.tassel_tcl && !DESKTOP_FNS.includes('tassel_tk'));
  assert.ok(STDLIB.bushel.web && STDLIB.furrow.web);
  assert.ok(LIB_FNS.includes('bushel_sort') && LIB_FNS.includes('furrow_sum'));
  assert.equal(MODULE_OF.bushel_push, 'bushel');
  assert.equal(MODULE_OF.furrow_get, 'furrow');
});

test('every list and array block writes the Cob call, and the shuck lines appear on their own', () => {
  const script = [
    make('newlist', { a: 'fruit' }), make('listadd', { a: 'fruit', b: '"pear"' }), make('listsort', { a: 'fruit' }),
    make('listlen', { a: 'n', b: 'fruit' }), make('listget', { a: 'f', b: 'fruit', c: '0' }),
    make('newarray', { a: 'row', b: '5' }), make('arrset', { a: 'row', b: '2', c: '7' }), make('arrget', { a: 'x', b: 'row', c: '2' }),
  ];
  assert.equal(gen(script), [
    'shuck bushel', 'shuck furrow',
    'set fruit = bushel_new()', 'bushel_push(fruit, "pear")', 'bushel_sort(fruit)', 'set n = bushel_len(fruit)', 'set f = bushel_get(fruit, 0)',
    'set row = furrow_new(5)', 'furrow_set(row, 2, 7)', 'set x = furrow_get(row, 2)', ''].join('\n'));
  assert.equal(genLines(script).filter(l => l.id === null).length, 2);
});

test('only the module that is used gets a shuck line', () => {
  assert.equal(gen([make('newarray', { a: 'row', b: '3' })]), 'shuck furrow\nset row = furrow_new(3)\n');
  assert.equal(gen([make('lib', { a: 'n', fn: 'bushel_len', b: 'fruit' })]), 'shuck bushel\nset n = bushel_len(fruit)\n');
});

test('list and array blocks need Cob 0.0.10, and so does a bushel call typed into a box', () => {
  assert.equal(minCob([make('newlist')]), '0.0.10');
  assert.equal(minCob([make('newarray')]), '0.0.10');
  assert.equal(minCob([make('set', { a: 'n', b: 'bushel_len(x)' })]), '0.0.10');
  assert.equal(minCob([make('lib', { a: 'n', fn: 'furrow_sum', b: 'row' })]), '0.0.10');
  assert.equal(minCob([make('lib', { a: 'n', fn: 'kernel_len', b: 'w' })]), '0.0.9');
  assert.equal(minCob([make('pop')]), null);
});

test('lint: empty boxes and odd names are caught', () => {
  assert.equal(lint([make('listadd', { a: 'fruit', b: '"pear"' })]).length, 0);
  assert.equal(lint([make('listget', { a: 'f', b: 'fruit', c: '' })])[0].level, 'error');
  assert.equal(lint([make('newlist', { a: 'my fruit' })])[0].level, 'warn');
  assert.equal(lint([make('listadd', { a: 'fruit', b: '"pear' })])[0].text, 'A quote mark " is missing.');
});

test('saved files are cleaned: new blocks survive, unknown functions still fall back', () => {
  const [b] = clean([{ t: 'arrset', a: 'row', b: '1', c: '2', evil: 'x' }]);
  assert.deepEqual([b.t, b.a, b.b, b.c, 'evil' in b], ['arrset', 'row', '1', '2', false]);
  assert.equal(clean([{ t: 'lib', fn: 'tassel_tcl', a: 'x', b: '1' }])[0].fn, LIB_FNS[0]);
});

test('every block in the new category is in the palette and has a category name', () => {
  assert.equal(CATS.list, 'Lists & arrays');
  const mine = Object.entries(BLOCKS).filter(([, d]) => d.cat === 'list').map(([t]) => t);
  assert.equal(mine.length, 12);
});

test('Cob warnings about lists and arrays are explained in plain words', () => {
  const e = s => explain(s, true);
  assert.match(e('[bushel] warning: bushel_get() -- position 5 is out of range (the list has 3 items)').msg, /Position 5 isn't in the list: it has 3 items/);
  assert.match(e('[bushel] warning: bushel_get() -- position 1 is out of range (the list has 1 item)').msg, /it has 1 item\./);
  assert.match(e('[furrow] warning: furrow_set() -- slot 9 is out of range (the array has 5 slots)').msg, /Slot 9 isn't in the array: it has 5 slots/);
  assert.match(e('[bushel] warning: bushel_push() -- list 0 is invalid or already freed').msg, /list used in bushel_push\(\) doesn't exist/);
  assert.match(e('[furrow] warning: furrow_len() -- array 3 is invalid or already freed').hint, /new array block/);
  assert.match(e('[furrow] warning: furrow_new(-1) -- the length must be between 0 and 10000000').msg, /can't have -1 slots/);
  assert.equal(e('[bushel] warning: bushel_get() -- position 5 is out of range (the list has 3 items)').level, 'warn');
});

test('the list and array examples lint clean and need the right Cob', () => {
  const ex = EXAMPLES.filter(x => /lists|arrays/.test(x.name));
  assert.equal(ex.length, 2);
  for (const x of ex) { const s = x.build(); assert.equal(lint(s).filter(p => p.level === 'error').length, 0, x.name); assert.equal(minCob(s), /lists/.test(x.name) ? '0.1.0' : '0.0.10', x.name); }
});

// ---- Cob 0.1.0: Python-style list syntax
test('the list syntax blocks write Cob 0.1.0 code, and add shuck bushel by themselves', () => {
  const script = [make('listlit', { a: 'fruit', b: '"pear", 30' }), make('listidx', { a: 'last', b: 'fruit', c: '-1' }), make('listput', { a: 'fruit', b: '0', c: '"fig"' }),
    make('foreach', { a: 'f', b: 'fruit', body: [make('pop', { a: 'f' })] })];
  assert.equal(gen(script), 'shuck bushel\nset fruit = ["pear", 30]\nset last = fruit[-1]\nset fruit[0] = "fig"\nfor f in fruit:\n    pop(f)\n');
  assert.equal(minCob(script), '0.1.0');
});

test('an empty for each block still has a body line', () => {
  assert.equal(gen([make('foreach')]), 'shuck bushel\nfor item in fruit:\n    # (empty)\n');
});

test('list syntax typed into any box is noticed, but strings and comments are not', () => {
  assert.ok(listSyntax(['set xs = [1, 2]']) && listSyntax(['pop(xs[0])']) && listSyntax(['for x in xs:']) && listSyntax(['  for x in bushel_range(3):']));
  assert.ok(!listSyntax(['pop("a [b] c")']) && !listSyntax(['set x = 1  # see [1]']) && !listSyntax(['pop("for x in y")']) && !listSyntax(['set format = 2']));
  assert.deepEqual(modulesUsed(['set xs = [1]']), ['bushel']);
  assert.equal(minCob([make('set', { a: 'xs', b: '[1, 2]' })]), '0.1.0');
  assert.equal(minCob([make('pop', { a: '"a [b] c"' })]), null);
  assert.equal(gen([make('set', { a: 'x', b: 'xs[0]' })]), 'shuck bushel\nset x = xs[0]\n');
});

test('the new blocks are linted like the old ones', () => {
  assert.equal(lint([make('listlit', { a: 'fruit', b: '' })])[0].level, 'error');
  assert.equal(lint([make('listidx', { a: 'my item', b: 'fruit', c: '0' })])[0].level, 'warn');
  assert.equal(lint([make('foreach', { a: 'f', b: 'fruit', body: [make('pop')] })]).filter(p => p.level === 'error').length, 0);
});

test('Cob messages for the new syntax are explained in plain words', () => {
  const e = s => explain(s, true);
  assert.match(e("[cob_interp] syntax error at line 3: expected ':' to open for block").msg, /for each block/);
  assert.match(e('[cob_interp] syntax error at line 2: malformed expression in for statement').hint, /name of a list/);
  assert.match(e("[cob_interp] syntax error at line 4: expected ']' to close the index in set statement").msg, /square brackets/);
});

test('and / or / not and trailing comments typed into a box need Cob 0.1.0', () => {
  assert.ok(boolSyntax(['if a > 1 and b < 2:']) && boolSyntax(['    while not done:']) && boolSyntax(['elif (a or b) and c:']));
  assert.ok(!boolSyntax(['if a > 1:']) && !boolSyntax(['pop("this and that")']) && !boolSyntax(['set x = a or b']) && !boolSyntax(['if a > 1:  # or maybe not']));
  assert.ok(trailingComment(['set x = 1  # note']) && trailingComment(['pop(x) # hi']));
  assert.ok(!trailingComment(['# a whole-line note']) && !trailingComment(['    # (empty)']) && !trailingComment(['pop("# not a comment")']));
  assert.equal(minCob([make('if', { a: 'x > 1 and y < 2' })]), '0.1.0');
  assert.equal(minCob([make('set', { a: 'x', b: '1  # one' })]), '0.1.0');
  assert.equal(minCob([make('if', { a: 'x > 1' })]), null);
  assert.equal(minCob([make('note', { a: 'a comment' })]), null);
});
