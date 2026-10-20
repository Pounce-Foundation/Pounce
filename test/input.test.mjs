import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync, mkdtempSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gen, make, lint, clean, usesInput, atLeast } from '../src/js/blocks.js';
import { EXAMPLES } from '../src/js/examples.js';
import { explain } from '../src/js/errors.js';
import { runSession, MAX_ANSWERS } from '../src/js/session.js';
import { saveProject, loadProject } from '../src/js/project.js';

test('input blocks generate Cob input() calls', () => {
  assert.equal(gen([make('ask', { a: 'name', b: '"Name? "' }), make('asknum', { a: 'age', b: '"Age? "' })]),
    'set name = input("Name? ")\nset age = input_int("Age? ")\n');
  assert.equal(gen([make('ask', { a: 'x', b: '' })]), 'set x = input()\n');
});
test('input blocks: lint, detection, version check, save/load', async () => {
  assert.equal(lint([make('ask', { a: 'x', b: '' })]).length, 0);                       // empty prompt is fine
  assert.equal(lint([make('ask', { a: '', b: '"Q"' })])[0].level, 'error');             // name is required
  assert.equal(lint([make('asknum', { a: 'my age', b: '"Q"' })])[0].level, 'warn');
  assert.equal(lint([make('ask', { a: 'x', b: '"Q' })])[0].level, 'error');
  assert.ok(usesInput([make('while', { a: '1', body: [make('asknum')] })]) && !usesInput([make('pop')]));
  assert.ok(atLeast('0.0.8', '0.0.8') && atLeast('0.1.0', '0.0.8') && !atLeast('0.0.7', '0.0.8'));
  const s = { title: 'T', script: [make('ask'), make('asknum')], modules: {} };
  assert.equal(gen((await loadProject(await saveProject(s).arrayBuffer())).script), gen(s.script));
  assert.equal(gen(clean([{ t: 'ask', a: 'n\nx', b: '"q"' }])), 'set n x = input("q")\n');
});
test('friendly message for a non-numeric answer', () => {
  const f = explain('[cob_interp] warning: input_int() got non-numeric input "abc"; treated as 0');
  assert.equal(f.level, 'warn'); assert.match(f.msg, /"abc"/); assert.match(f.msg, /number/);
});

// ---- replay session -------------------------------------------------------------------------
// A fake program: asks 2 questions, printing before and after each, like the real thing would.
const fakeOnce = log => async (inputs, on) => {
  log.push(inputs.length);
  on({ k: 'out', t: 'start' });
  for (let i = 0; i < 2; i++) {
    if (i >= inputs.length) return { need: { prompt: 'Q' + (i + 1) + '? ' } };
    on({ k: 'out', t: 'Q' + (i + 1) + '? ' + inputs[i] });
  }
  on({ k: 'out', t: 'bye ' + inputs.join('+') }); on({ k: 'err', t: 'warn once' });
  return {};
};
test('replay shows each line once and feeds answers back in order', async () => {
  const seen = [], runs = [], prompts = [], answers = ['Ada', 'Bob'];
  await runSession({ once: fakeOnce(runs), ask: async p => { prompts.push(p); return answers.shift(); }, on: m => seen.push(m.k + ':' + m.t) });
  assert.deepEqual(seen, ['out:start', 'out:Q1? Ada', 'out:Q2? Bob', 'out:bye Ada+Bob', 'err:warn once']);
  assert.deepEqual(prompts, ['Q1? ', 'Q2? ']); assert.deepEqual(runs, [0, 1, 2]);
});
test('Stop while waiting for an answer ends the session; newlines in answers are flattened', async () => {
  const seen = [];
  await runSession({ once: fakeOnce([]), ask: async () => null, on: m => seen.push(m.t) });
  assert.deepEqual(seen, ['start']);
  const got = []; let first = true;
  await runSession({ once: async inp => (inp.length ? (got.push(inp[0]), {}) : { need: { prompt: '' } }), ask: async () => 'a\nb', on() {} });
  assert.deepEqual(got, ['a b']);
  let stop = false, calls = 0;
  await runSession({ once: async () => { calls++; stop = true; return { need: { prompt: '' } }; }, ask: async () => 'x', on() {}, stopped: () => stop });
  assert.equal(calls, 1);
});
test('a program that asks forever is cut off', async () => {
  const seen = []; let runs = 0;
  await runSession({ once: async () => (runs++, { need: { prompt: '' } }), ask: async () => '1', on: m => seen.push(m) });
  assert.equal(runs, MAX_ANSWERS + 1); assert.match(seen.at(-1).t, /more than 500/);
});

// ---- the real worker file, against a fake Emscripten module -----------------------------------
// The fake follows what Emscripten's stdin device does: one read() asks the stdin callback for bytes
// until it returns null (or the buffer is full). The "program" is Cob's input()/pop() in miniature.
function runWorker(inputs) {
  const posted = [];
  const ctx = {
    importScripts() {}, postMessage: m => posted.push(m), TextDecoder, TextEncoder, URL, self: { location: { href: 'http://x/js/cob-worker.js' } },
    createCobModule: async opts => ({
      FS: { writeFile() {} },
      callMain() {
        const out = s => { for (const c of Buffer.from(s)) opts.stdout(c); };
        const readLine = () => {                         // fgets over a device read loop
          const bytes = []; for (let i = 0; i < 1024; i++) { const c = opts.stdin(); if (c == null) break; bytes.push(c); }
          return Buffer.from(bytes).toString().replace(/\n$/, '');
        };
        const ask = p => { out(p); return readLine(); };
        out('before\n'); const a = ask('Name? '); out('Hello, ' + a + '!\n'); const b = ask('Age? '); out('Age ' + b + '\n');
      },
    }),
  };
  vm.createContext(ctx); vm.runInContext(readFileSync(new URL('../src/js/cob-worker.js', import.meta.url), 'utf8'), ctx);
  return ctx.onmessage({ data: { code: '', modules: {}, noGC: false, inputs } }).then(() => posted.map(m => m.k + ':' + (m.t ?? '')));
}
test('worker asks for input, with the unfinished prompt line', async () => {
  assert.deepEqual(await runWorker([]), ['out:before', 'need:Name? ', 'done:']);
  assert.deepEqual(await runWorker(['Ada']), ['out:before', 'out:Name? Ada', 'out:Hello, Ada!', 'need:Age? ', 'done:']);
});
test('worker finishes when it has every answer, echoing them like a terminal', async () => {
  assert.deepEqual(await runWorker(['Ada', '41']), ['out:before', 'out:Name? Ada', 'out:Hello, Ada!', 'out:Age? 41', 'out:Age 41', 'done:']);
  assert.deepEqual(await runWorker(['Zoë', '']), ['out:before', 'out:Name? Zoë', 'out:Hello, Zoë!', 'out:Age? ', 'out:Age ', 'done:']);
});
test('worker + session together: the console shows one clean run', async () => {
  const seen = [], answers = ['Ada', '41'];
  await runSession({ once: async (inputs, on) => { const m = await runWorker(inputs); let need = null;
      for (const x of m) { const [k, ...t] = x.split(':'); if (k === 'need') need = { prompt: t.join(':') }; else if (k !== 'done') on({ k, t: t.join(':') }); } return need ? { need } : {}; },
    ask: async () => answers.shift(), on: m => seen.push(m.t) });
  assert.deepEqual(seen, ['before', 'Name? Ada', 'Hello, Ada!', 'Age? 41', 'Age 41']);
});

// ---- real Cob (optional) ---------------------------------------------------------------------
const COB = process.env.COB_INTERP, skip = !COB && 'set COB_INTERP to run';
const runCob = (code, input) => {
  const f = join(mkdtempSync(join(tmpdir(), 'pounce-')), 'p.cob'); writeFileSync(f, code);
  return spawnSync(COB, [f, '--no-cache'], { encoding: 'utf8', input });
};
test('input examples work in real Cob with typed answers', { skip }, () => {
  const ex = Object.fromEntries(EXAMPLES.map(e => [e.name, gen(e.build())]));
  assert.equal(runCob(ex['Say hello (ask a question)'], 'Ada\n').stdout, 'What is your name? Hello, Ada!\n');
  assert.equal(runCob(ex['Add two numbers (ask)'], '20\n22\n').stdout, 'First number? Second number? Total: 42\n');
  const g = runCob(ex['Guess my number (ask + if)'], '3\n9\n7\n');
  assert.equal(g.status, 0); assert.equal(g.stderr, '');
  assert.deepEqual(g.stdout.split('\n').map(l => l.replace(/^Guess my number \(1 to 10\): /, '')).filter(Boolean), ['Too low', 'Too high', 'You got it!']);
});
test('a non-number typed into an input_int block warns and uses 0', { skip }, () => {
  const r = runCob(gen([make('asknum', { a: 'n', b: '"n? "' }), make('pop', { a: 'n + 1' })]), 'abc\n');
  assert.equal(r.stdout, 'n? 1\n'); assert.equal(explain(r.stderr.trim()).level, 'warn');
});
