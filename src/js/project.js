// The .pounce project format: a zip (like Scratch's .sb3) holding
//   project.json     blocks + metadata (what Pounce loads)
//   main.cob         the generated Cob program (so the file is useful without Pounce)
//   modules/NAME.cob optional modules for `shuck NAME`
import { writeZip, readZip } from './zip.js';
import { gen, clean } from './blocks.js';
export const FORMAT = 'pounce', VERSION = 1;
const dec = new TextDecoder();
export function saveProject(state, cobVersion = null) {
  const files = {
    'project.json': JSON.stringify({ format: FORMAT, formatVersion: VERSION, meta: { title: state.title, generator: 'Pounce', cob: cobVersion }, script: state.script }, null, 1),
    'main.cob': gen(state.script),
  };
  for (const [n, s] of Object.entries(state.modules)) files[`modules/${n}.cob`] = s;
  return writeZip(files);
}
export async function loadProject(buf) {
  const f = await readZip(buf);
  if (!f['project.json']) throw new Error('Missing project.json: not a Pounce project');
  const j = JSON.parse(dec.decode(f['project.json']));
  if (j.format !== FORMAT) throw new Error('Not a Pounce project');
  if (j.formatVersion > VERSION) throw new Error('This project was made with a newer Pounce');
  const modules = {};
  for (const [n, d] of Object.entries(f)) { const m = /^modules\/([A-Za-z0-9_-]+)\.cob$/.exec(n); if (m) modules[m[1]] = dec.decode(d); }
  return { title: String(j.meta?.title || 'Untitled').slice(0, 80), script: clean(j.script), modules };
}
