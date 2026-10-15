import { gen, genLines, lint, usesNoGC } from './blocks.js';
import { EXAMPLES } from './examples.js';
import { explain } from './errors.js';
import { mountEditor } from './editor.js';
import { saveProject, loadProject } from './project.js';
import { Runner } from './runner.js';
const $ = s => document.querySelector(s);
const store = { get: k => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };
const state = { title: 'My Pounce project', script: [], modules: {} };
let cobVersion = null, lineIds = [], flagged = new Set();
const out = $('#out');

function log(kind, text) { const d = document.createElement('div'); d.className = kind; d.textContent = text; out.append(d); out.scrollTop = out.scrollHeight; }
// A friendly message: { level: 'error'|'warn'|'note', msg, hint, id?, raw? }
function friendly(f) {
  const d = document.createElement('div'); d.className = 'friend ' + f.level;
  const b = document.createElement('b'); b.textContent = (f.level === 'error' ? 'Oops: ' : f.level === 'warn' ? 'Heads up: ' : 'Note: ') + f.msg; d.append(b);
  if (f.hint) { const h = document.createElement('span'); h.className = 'hint'; h.textContent = f.hint; d.append(h); }
  if (f.id != null) { flagged.add(f.id); editor.flag([...flagged]); const w = document.createElement('span'); w.className = 'hint'; w.textContent = 'Look for the block with the red outline.'; d.append(w); }
  if (f.raw) { const s = document.createElement('small'); s.textContent = 'Cob said: ' + f.raw.replace(/^\[cob_interp\] /, ''); d.append(s); }
  out.append(d); out.scrollTop = out.scrollHeight;
}
function show(m) {
  if (m.k === 'out' || m.k === 'err') {
    const f = explain(m.t, m.k === 'err');
    if (f) { if (f.line) f.id = lineIds[f.line - 1]; return friendly(f); }
    return log(m.k === 'out' ? 'o' : 'e', m.t);
  }
  log(m.k === 'fatal' ? 'e' : 's', m.t);
}
const update = () => { $('#code').textContent = gen(state.script) || '# Drag blocks into the script to begin\n'; $('#mods').textContent = Object.keys(state.modules).join(', ') || 'none'; flagged.clear(); editor.flag([]); };
const editor = mountEditor({ pal: $('#pal'), ws: $('#ws'), state, onChange: update });
const load = s => { Object.assign(state, s); $('#title').value = state.title; editor.render(); };
const dl = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
const fileName = () => (state.title.trim() || 'pounce').replace(/[^\w.-]+/g, '_');

const runner = new Runner(show);
const busy = b => { $('#run').disabled = b; $('#stop').disabled = !b; };
$('#run').onclick = async () => {
  out.textContent = ''; flagged.clear(); editor.flag([]);
  if (!state.script.length) { log('s', 'Add some blocks first.'); return; }
  const probs = lint(state.script);
  probs.forEach(p => friendly({ level: p.level, msg: p.text, hint: p.hint, id: p.id }));
  if (probs.some(p => p.level === 'error')) { log('s', 'Fix the red blocks, then press Run again.'); return; }
  const lines = genLines(state.script); lineIds = lines.map(l => l.id);
  busy(true);
  await runner.run(lines.map(l => l.t).join('\n') + '\n', state.modules, usesNoGC(state.script));
  busy(false);
};
$('#stop').onclick = () => runner.stop();
$('#title').oninput = e => { state.title = e.target.value; };
const ex = $('#ex'); EXAMPLES.forEach((e, i) => ex.add(new Option(e.name, i)));
ex.onchange = () => { const e = EXAMPLES[ex.value]; ex.value = ''; if (e) { out.textContent = ''; load({ script: e.build(), title: e.name }); } };
$('#clr').onclick = () => { out.textContent = ''; load({ script: [], modules: {} }); };
$('#save').onclick = () => dl(saveProject(state, cobVersion), fileName() + '.pounce');
$('#cob').onclick = () => dl(new Blob([gen(state.script)], { type: 'text/plain' }), fileName() + '.cob');
$('#cp').onclick = async e => { try { await navigator.clipboard.writeText(gen(state.script)); e.target.textContent = 'Copied'; setTimeout(() => e.target.textContent = 'Copy', 1200); } catch {} };
$('#open').onclick = () => $('#file').click();
$('#file').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try { load(await loadProject(await f.arrayBuffer())); } catch (x) { out.textContent = ''; friendly({ level: 'error', msg: "That file couldn't be opened.", hint: 'Pick a .pounce file saved from Pounce.', raw: x.message }); }
};
$('#addmod').onclick = () => $('#mfile').click();
$('#mfile').onchange = async e => {
  for (const f of e.target.files) {
    const n = f.name.replace(/\.cob$/, '');
    if (/^[A-Za-z0-9_-]+$/.test(n)) state.modules[n] = await f.text(); else friendly({ level: 'error', msg: `"${f.name}" can't be used as a module name.`, hint: 'Use only letters, numbers, - and _ in the file name.' });
  }
  e.target.value = ''; update();
};
const simple = $('#simple'); simple.checked = store.get('pounce.simple') !== '0';
const applySimple = () => { document.body.classList.toggle('simple-on', simple.checked); store.set('pounce.simple', simple.checked ? '1' : '0'); };
simple.onchange = applySimple; applySimple();
const help = $('#help'); help.hidden = store.get('pounce.help') === 'seen';
$('#gotit').onclick = () => { help.hidden = true; store.set('pounce.help', 'seen'); };
$('#helpbtn').onclick = () => { help.hidden = !help.hidden; };
fetch('wasm/version.txt').then(r => r.ok ? r.text() : Promise.reject()).then(v => { cobVersion = v.trim(); $('#ver').textContent = 'Cob ' + cobVersion + ' · WebAssembly'; })
  .catch(() => { $('#ver').textContent = 'WebAssembly build not found'; });
load({ script: EXAMPLES[0].build(), title: EXAMPLES[0].name });
