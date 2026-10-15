// Block definitions, code generation and sanitising. DOM-free (tested in Node).
let uid = 1;
export const DESKTOP_FNS = ['sql_open','sql_exec','sql_query','sql_close','window_open','window_label',
  'window_button','window_slider','window_textbox','window_wait','window_close','tcl_eval'];
export const CATS = { out:'Output', var:'Variables', ctl:'Control', mod:'Modules', mem:'Memory (--no-gc)', desk:'Desktop-only (no-op in browser)', note:'Notes' };
const F = (k, w) => ({ k, w });
export const BLOCKS = {
  pop:    { cat:'out', parts:['pop(', F('a',180), ')'], def:{a:'"Hello, World!"'}, gen:b=>`pop(${b.a})` },
  set:    { cat:'var', parts:['set', F('a',80), '=', F('b',140)], def:{a:'age',b:'20'}, gen:b=>`set ${b.a} = ${b.b}` },
  while:  { cat:'ctl', parts:['while', F('a',150), ':'], def:{a:'count < 5'}, c:1, gen:b=>`while ${b.a}:` },
  shuck:  { cat:'mod', parts:['shuck', F('a',110)], def:{a:'greeter'}, gen:b=>`shuck ${b.a}` },
  harvest:{ cat:'mem', parts:['set', F('a',80), '= harvest(', F('b',70), ')'], def:{a:'buffer',b:'1024'}, nogc:1, gen:b=>`set ${b.a} = harvest(${b.b})` },
  trash:  { cat:'mem', parts:['trash(', F('a',90), ')'], def:{a:'buffer'}, nogc:1, gen:b=>`trash(${b.a})` },
  call:   { cat:'desk', parts:['set', F('a',60), '=', { k:'fn', opts:DESKTOP_FNS }, '(', F('b',150), ')'], def:{a:'rc',fn:'sql_open',b:'"scores.db"'}, gen:b=>`set ${b.a} = ${b.fn}(${b.b})` },
  extern: { cat:'desk', parts:['extern', F('a',90), '(', F('b',70), ') from', F('c',110)], def:{a:'calculate_fast',b:'x',c:'math_ext.so'}, gen:b=>`extern ${b.a}(${b.b}) from "${b.c}"` },
  note:   { cat:'note', parts:['#', F('a',220)], def:{a:'a comment'}, gen:b=>`# ${b.a}` },
};
export const make = (t, over = {}) => ({ id: uid++, t, ...BLOCKS[t].def, ...over, ...(BLOCKS[t].c ? { body: [] } : {}) });
// Each generated line remembers which block made it (used to point errors at blocks).
export function genLines(list, ind = '', out = []) {
  for (const b of list) {
    const d = BLOCKS[b.t]; if (!d) continue;
    out.push({ t: ind + d.gen(b), id: b.id });
    if (d.c) { if (b.body.length) genLines(b.body, ind + '    ', out); else out.push({ t: ind + '    # (empty)', id: b.id }); }
  }
  return out;
}
export const gen = list => genLines(list).map(l => l.t + '\n').join('');
export const usesNoGC = l => l.some(b => BLOCKS[b.t]?.nogc || (b.body && usesNoGC(b.body)));
export function find(list, id) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) return { list, i, b: list[i] };
    if (list[i].body) { const r = find(list[i].body, id); if (r) return r; }
  }
  return null;
}
export const ownsList = (b, list) => !!b.body && (b.body === list || b.body.some(x => ownsList(x, list)));
// Rebuild blocks from untrusted JSON: known types only, string fields only, single-line values, bounded depth.
export function clean(list, depth = 0) {
  if (!Array.isArray(list) || depth > 32) return [];
  const one = v => String(v ?? '').replace(/[\r\n]+/g, ' ').slice(0, 400);
  return list.filter(b => b && BLOCKS[b.t]).map(b => {
    const d = BLOCKS[b.t], o = { id: uid++, t: b.t };
    for (const k of Object.keys(d.def)) o[k] = one(b[k] ?? d.def[k]);
    if (b.t === 'call' && !DESKTOP_FNS.includes(o.fn)) o.fn = DESKTOP_FNS[0];
    if (d.c) o.body = clean(b.body, depth + 1);
    return o;
  });
}
export function sample() {
  const w = make('while', { a: 'count < 5' });
  w.body = [make('pop', { a: '"Harvesting... " + count' }), make('set', { a: 'count', b: 'count + 1' })];
  return [make('note', { a: 'Pounce example' }), make('pop', { a: '"Hello, World!"' }), make('set', { a: 'count', b: '0' }), w];
}

const quotes = s => { let n = 0; for (let i = 0; i < s.length; i++) { if (s[i] === '\\') i++; else if (s[i] === '"') n++; } return n; };
// Friendly checks run before Cob sees the program. level 'error' blocks the run.
export function lint(list, out = []) {
  for (const b of list) {
    const d = BLOCKS[b.t]; if (!d) continue;
    const boxes = d.parts.filter(p => p.k && p.k !== 'fn');
    if (b.t !== 'note' && boxes.some(p => !(((b.t === 'call' || b.t === 'extern') && p.k === 'b')) && !String(b[p.k] ?? '').trim()))
      out.push({ id: b.id, level: 'error', text: 'A block has an empty box.', hint: 'Fill in every box, or delete the block.' });
    if (boxes.some(p => quotes(String(b[p.k] ?? '')) % 2))
      out.push({ id: b.id, level: 'error', text: 'A quote mark " is missing.', hint: 'Words need a quote at the start and the end, like "Hello".' });
    if ((b.t === 'set' || b.t === 'harvest') && b.a.trim() && !/^[A-Za-z_]\w*$/.test(b.a.trim()))
      out.push({ id: b.id, level: 'warn', text: `"${b.a.trim()}" may not work as a variable name.`, hint: 'Use one word with letters, numbers and _ only, like score or my_score.' });
    if (d.c && !b.body.length) out.push({ id: b.id, level: 'warn', text: 'This while block has nothing inside it.', hint: 'Drag blocks into it, and make sure one changes something so the loop can stop.' });
    if (b.body) lint(b.body, out);
  }
  return out;
}
