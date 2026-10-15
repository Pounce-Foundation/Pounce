import { BLOCKS, CATS, make, find, ownsList } from './blocks.js';
const el = (tag, cls, txt) => { const e = document.createElement(tag); if (cls) e.className = cls; if (txt != null) e.textContent = txt; return e; };

export function mountEditor({ pal, ws, state, onChange }) {
  function blockEl(b) {
    const d = BLOCKS[b.t], box = el('div', 'blk c-' + d.cat), row = el('div', 'row');
    box.draggable = true; box.dataset.id = b.id;
    for (const p of d.parts) {
      if (typeof p === 'string') row.append(el('span', '', p));
      else if (p.opts) {
        const s = el('select'); p.opts.forEach(o => s.add(new Option(o, o))); s.value = b[p.k];
        s.onchange = () => { b[p.k] = s.value; onChange(); }; row.append(s);
      } else {
        const i = el('input'); i.value = b[p.k]; i.style.width = (p.w || 120) + 'px'; i.setAttribute('aria-label', p.k);
        i.oninput = () => { b[p.k] = i.value; onChange(); };
        i.onfocus = () => { box.draggable = false; }; i.onblur = () => { box.draggable = true; };
        row.append(i);
      }
    }
    const x = el('button', 'x', '×'); x.title = x.ariaLabel = 'Delete block';
    x.onclick = e => { e.stopPropagation(); const r = find(state.script, b.id); r.list.splice(r.i, 1); render(); };
    row.append(x); box.append(row);
    box.ondragstart = e => { e.stopPropagation(); e.dataTransfer.setData('text/plain', 'move:' + b.id); e.dataTransfer.effectAllowed = 'move'; };
    if (b.body) { const c = el('div', 'c'); c.append(listEl(b.body)); box.append(c); }
    return box;
  }
  function dz(list, i) {
    const z = el('div', 'dz');
    z.ondragover = e => { e.preventDefault(); e.stopPropagation(); z.classList.add('over'); };
    z.ondragleave = () => z.classList.remove('over');
    z.ondrop = e => { e.preventDefault(); e.stopPropagation(); z.classList.remove('over'); drop(e.dataTransfer.getData('text/plain'), list, i); };
    return z;
  }
  function listEl(list) {
    const w = el('div'); list.forEach((b, i) => { w.append(dz(list, i), blockEl(b)); }); w.append(dz(list, list.length)); return w;
  }
  function drop(data, list, i) {
    const [k, v] = data.split(':');
    if (k === 'new' && BLOCKS[v]) list.splice(i, 0, make(v));
    else if (k === 'move') {
      const r = find(state.script, +v); if (!r || ownsList(r.b, list)) return;
      r.list.splice(r.i, 1); if (r.list === list && r.i < i) i--; list.splice(i, 0, r.b);
    }
    render();
  }
  function render() {
    ws.replaceChildren();
    if (!state.script.length) ws.append(el('div', 'empty', 'Drag blocks here, or tap a block on the left to add it.'));
    ws.append(listEl(state.script)); onChange();
  }
  ws.ondragover = e => e.preventDefault();
  ws.ondrop = e => { e.preventDefault(); drop(e.dataTransfer.getData('text/plain'), state.script, state.script.length); };

  for (const [cat, name] of Object.entries(CATS)) {
    const h = el('h3', '', name); if (cat === 'mem' || cat === 'desk') h.dataset.adv = 1; pal.append(h);
    for (const [t, d] of Object.entries(BLOCKS)) {
      if (d.cat !== cat) continue;
      const e = el('div', 'blk c-' + cat, d.parts.map(p => typeof p === 'string' ? p : p.opts ? p.opts[0] : '…').join(' '));
      e.draggable = true; e.tabIndex = 0; if (cat === 'mem' || cat === 'desk') e.dataset.adv = 1; e.setAttribute('role', 'button');
      e.ondragstart = ev => { ev.dataTransfer.setData('text/plain', 'new:' + t); ev.dataTransfer.effectAllowed = 'copy'; };
      const add = () => { state.script.push(make(t)); render(); };
      e.onclick = add; e.onkeydown = ev => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); add(); } };
      pal.append(e);
    }
  }
  function flag(ids) {
    ws.querySelectorAll('.err-hl').forEach(e => e.classList.remove('err-hl'));
    let first = null;
    for (const id of ids) { const e = ws.querySelector(`[data-id="${id}"]`); if (e) { e.classList.add('err-hl'); first = first || e; } }
    if (first) first.scrollIntoView({ block: 'nearest' });
  }
  return { render, flag };
}
