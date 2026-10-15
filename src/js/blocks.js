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
export function gen(list, ind = '') {
  return list.map(b => {
    const d = BLOCKS[b.t]; if (!d) return '';
    const head = ind + d.gen(b) + '\n';
    return d.c ? head + (b.body.length ? gen(b.body, ind + '    ') : ind + '    # (empty)\n') : head;
  }).join('');
}
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
