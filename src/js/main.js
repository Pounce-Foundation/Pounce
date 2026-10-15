import { gen, usesNoGC, sample } from './blocks.js';
import { mountEditor } from './editor.js';
import { saveProject, loadProject } from './project.js';
import { Runner } from './runner.js';
const $ = s => document.querySelector(s);
const state = { title: 'My Pounce project', script: [], modules: {} };
let cobVersion = null;
const out = $('#out');

function log(kind, text) { const d = document.createElement('div'); d.className = kind; d.textContent = text; out.append(d); out.scrollTop = out.scrollHeight; }
const update = () => { $('#code').textContent = gen(state.script) || '# Drag blocks into the script to begin\n'; $('#mods').textContent = Object.keys(state.modules).join(', ') || 'none'; };
const editor = mountEditor({ pal: $('#pal'), ws: $('#ws'), state, onChange: update });
const load = s => { Object.assign(state, s); $('#title').value = state.title; editor.render(); };
const dl = (blob, name) => { const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
const fileName = () => (state.title.trim() || 'pounce').replace(/[^\w.-]+/g, '_');

const runner = new Runner(m => log(m.k === 'out' ? 'o' : m.k === 'err' || m.k === 'fatal' ? 'e' : 's', m.t));
const busy = b => { $('#run').disabled = b; $('#stop').disabled = !b; };
$('#run').onclick = async () => {
  if (!state.script.length) { out.textContent = ''; log('s', 'Add some blocks first.'); return; }
  out.textContent = ''; busy(true);
  await runner.run(gen(state.script), state.modules, usesNoGC(state.script));
  busy(false);
};
$('#stop').onclick = () => runner.stop();
$('#title').oninput = e => { state.title = e.target.value; };
$('#ex').onclick = () => load({ script: sample() });
$('#clr').onclick = () => { out.textContent = ''; load({ script: [], modules: {} }); };
$('#save').onclick = () => dl(saveProject(state, cobVersion), fileName() + '.pounce');
$('#cob').onclick = () => dl(new Blob([gen(state.script)], { type: 'text/plain' }), fileName() + '.cob');
$('#cp').onclick = async e => { try { await navigator.clipboard.writeText(gen(state.script)); e.target.textContent = 'Copied'; setTimeout(() => e.target.textContent = 'Copy', 1200); } catch {} };
$('#open').onclick = () => $('#file').click();
$('#file').onchange = async e => {
  const f = e.target.files[0]; e.target.value = ''; if (!f) return;
  try { load(await loadProject(await f.arrayBuffer())); } catch (x) { out.textContent = ''; log('e', 'Could not open project: ' + x.message); }
};
$('#addmod').onclick = () => $('#mfile').click();
$('#mfile').onchange = async e => {
  for (const f of e.target.files) {
    const n = f.name.replace(/\.cob$/, '');
    if (/^[A-Za-z0-9_-]+$/.test(n)) state.modules[n] = await f.text(); else log('e', 'Module names may only use letters, digits, - and _: ' + f.name);
  }
  e.target.value = ''; update();
};
fetch('wasm/version.txt').then(r => r.ok ? r.text() : Promise.reject()).then(v => { cobVersion = v.trim(); $('#ver').textContent = 'Cob ' + cobVersion + ' · WebAssembly'; })
  .catch(() => { $('#ver').textContent = 'WebAssembly build not found'; });
load({ script: sample() });
