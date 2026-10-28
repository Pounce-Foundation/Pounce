// Block definitions, code generation and sanitising. DOM-free (tested in Node).
let uid = 1;
// Cob 0.0.9: everything beyond the core language is a corn-themed standard library of shared libraries,
// brought in with `shuck <module>`. Pounce writes the shuck lines for you (see genLines).
// Modules marked `web` are compiled into the browser build; the others need the desktop Cob.
export const STDLIB = {
  porch:    { web: 1, fns: ['porch_ask', 'porch_ask_int'] },
  cornmath: { web: 1, fns: ['husk_abs', 'ear_max', 'ear_min', 'stalk_pow', 'stalk_sqrt', 'silk_mod', 'scatter_seed', 'scatter_rand'] },
  kernels:  { web: 1, fns: ['kernel_len', 'kernel_upper', 'kernel_lower', 'kernel_slice', 'kernel_find', 'kernel_repeat', 'kernel_trim',
                            'kernel_replace', 'kernel_char', 'kernel_code', 'kernel_from_code', 'kernel_to_int', 'kernel_starts', 'kernel_ends'] },
  almanac:  { web: 1, fns: ['almanac_now', 'almanac_ticks', 'almanac_nap', 'almanac_year', 'almanac_stamp'] },
  granary:  { web: 0, fns: ['granary_read', 'granary_write', 'granary_append', 'granary_exists', 'granary_remove'] },
  pantry:   { web: 0, fns: ['pantry_open', 'pantry_exec', 'pantry_query', 'pantry_close'] },
  barn:     { web: 0, fns: ['barn_open', 'barn_label', 'barn_button', 'barn_slider', 'barn_textbox', 'barn_wait', 'barn_close'] },
  tassel:   { web: 0, fns: ['tassel_tcl', 'tassel_tk'] },
};
export const MODULE_OF = Object.fromEntries(Object.entries(STDLIB).flatMap(([m, d]) => d.fns.map(f => [f, m])));
// Library blocks offered in the browser. porch has its own blocks, and almanac (the clock) is left out on purpose:
// Pounce replays a program from the top for every answer (see session.js), and a clock would differ each time.
export const LIB_FNS = Object.entries(STDLIB).filter(([m, d]) => d.web && m !== 'porch' && m !== 'almanac').flatMap(([, d]) => d.fns);
export const DESKTOP_FNS = Object.entries(STDLIB).filter(([, d]) => !d.web).flatMap(([, d]) => d.fns);
export const CATS = { out:'Output', inp:'Input', var:'Variables', ctl:'Control', fn:'Recipes (functions)', lib:'Standard library', mod:'Modules', mem:'Memory (--no-gc)', desk:'Desktop-only (no-op in browser)', note:'Notes' };
const F = (k, w) => ({ k, w });
export const BLOCKS = {
  pop:    { cat:'out', parts:['pop(', F('a',180), ')'], def:{a:'"Hello, World!"'}, gen:b=>`pop(${b.a})` },
  // Console input = the `porch` library (Cob 0.0.9+). The prompt box may be empty: porch_ask() is fine.
  ask:    { cat:'inp', parts:['set', F('a',80), '= porch_ask(', F('b',170), ')'], def:{a:'name',b:'"What is your name? "'}, input:1, needs:'0.0.9', gen:b=>`set ${b.a} = porch_ask(${b.b})` },
  asknum: { cat:'inp', parts:['set', F('a',80), '= porch_ask_int(', F('b',170), ')'], def:{a:'age',b:'"How old are you? "'}, input:1, needs:'0.0.9', gen:b=>`set ${b.a} = porch_ask_int(${b.b})` },
  set:    { cat:'var', parts:['set', F('a',80), '=', F('b',140)], def:{a:'age',b:'20'}, gen:b=>`set ${b.a} = ${b.b}` },
  while:  { cat:'ctl', parts:['while', F('a',150), ':'], def:{a:'count < 5'}, c:1, gen:b=>`while ${b.a}:` },
  // if / else if / else (Cob 0.0.7+). `else if` and `else` are sibling blocks that must sit directly
  // under an `if` / `else if` in the same list; lint() checks that and Cob re-checks it.
  if:     { cat:'ctl', parts:['if', F('a',150), ':'], def:{a:'age >= 18'}, c:1, gen:b=>`if ${b.a}:` },
  elif:   { cat:'ctl', parts:['else if', F('a',150), ':'], def:{a:'age >= 13'}, c:1, gen:b=>`elif ${b.a}:` },
  else:   { cat:'ctl', parts:['else:'], def:{}, c:1, gen:()=>'else:' },
  // Recipes = functions (Cob 0.0.9+). `recipe` defines one (top level only), `serve` hands a value back.
  recipe: { cat:'fn', parts:['recipe', F('a',90), '(', F('b',110), '):'], def:{a:'add',b:'a, b'}, c:1, needs:'0.0.9', gen:b=>`recipe ${b.a}(${b.b}):` },
  serve:  { cat:'fn', parts:['serve', F('a',160)], def:{a:'a + b'}, needs:'0.0.9', gen:b=>b.a.trim() ? `serve ${b.a}` : 'serve' },
  run:    { cat:'fn', parts:[F('a',90), '(', F('b',150), ')'], def:{a:'greet',b:'"Ada"'}, needs:'0.0.9', gen:b=>`${b.a}(${b.b})` },
  // Standard library calls that also work in the browser. Pounce adds the `shuck` line.
  lib:    { cat:'lib', parts:['set', F('a',70), '=', { k:'fn', opts:LIB_FNS }, '(', F('b',150), ')'], def:{a:'result',fn:'kernel_upper',b:'"corn"'}, needs:'0.0.9', gen:b=>`set ${b.a} = ${b.fn}(${b.b})` },
  shuck:  { cat:'mod', parts:['shuck', F('a',110)], def:{a:'greeter'}, gen:b=>`shuck ${b.a}` },
  harvest:{ cat:'mem', parts:['set', F('a',80), '= harvest(', F('b',70), ')'], def:{a:'buffer',b:'1024'}, nogc:1, gen:b=>`set ${b.a} = harvest(${b.b})` },
  trash:  { cat:'mem', parts:['trash(', F('a',90), ')'], def:{a:'buffer'}, nogc:1, gen:b=>`trash(${b.a})` },
  call:   { cat:'desk', parts:['set', F('a',60), '=', { k:'fn', opts:DESKTOP_FNS }, '(', F('b',150), ')'], def:{a:'rc',fn:'pantry_open',b:'"scores.db"'}, needs:'0.0.9', gen:b=>`set ${b.a} = ${b.fn}(${b.b})` },
  extern: { cat:'desk', parts:['extern', F('a',90), '(', F('b',70), ') from', F('c',110)], def:{a:'calculate_fast',b:'x',c:'math_ext.so'}, gen:b=>`extern ${b.a}(${b.b}) from "${b.c}"` },
  note:   { cat:'note', parts:['#', F('a',220)], def:{a:'a comment'}, gen:b=>`# ${b.a}` },
};
// Container blocks start with an empty body, but a `body` passed in `over` wins (the starter examples rely on this).
export const make = (t, over = {}) => ({ id: uid++, t, ...BLOCKS[t].def, ...(BLOCKS[t].c ? { body: [] } : {}), ...over });
// Each generated line remembers which block made it (used to point errors at blocks).
function emit(list, ind, out) {
  for (const b of list) {
    const d = BLOCKS[b.t]; if (!d) continue;
    out.push({ t: ind + d.gen(b), id: b.id });
    if (d.c) { if (b.body.length) emit(b.body, ind + '    ', out); else out.push({ t: ind + '    # (empty)', id: b.id }); }
  }
  return out;
}
// Which standard library modules a program calls into: any library function name followed by `(`,
// ignoring comments and the inside of strings. Returned in STDLIB order.
export function calledNames(lines) {
  const names = new Set();
  for (const l of lines) {
    const code = l.replace(/"(?:\\.|[^"\\])*"/g, '""');
    if (/^\s*#/.test(code)) continue;
    for (const m of code.matchAll(/\b([A-Za-z_]\w*)\s*\(/g)) names.add(m[1]);
  }
  return names;
}
export function modulesUsed(lines) {
  const used = new Set([...calledNames(lines)].map(n => MODULE_OF[n]).filter(Boolean));
  return Object.keys(STDLIB).filter(m => used.has(m));
}
// The program's lines, with `shuck <module>` lines on top for every library it uses (unless the
// script already has its own shuck block for that module). Those lines have id null.
// With opts.seed, a program that uses scatter_rand (and never seeds it itself) gets a scatter_seed(seed) line too:
// that makes a run repeatable, which replaying for questions needs. Pounce picks a new seed for each Run click.
export function genLines(list, opts = {}) {
  const out = emit(list, '', []), text = out.map(l => l.t);
  const have = new Set(text.map(t => /^\s*shuck\s+(\S+)\s*$/.exec(t)?.[1]).filter(Boolean));
  const pre = modulesUsed(text).filter(m => !have.has(m)).map(m => ({ t: `shuck ${m}`, id: null }));
  const names = calledNames(text);
  if (opts.seed != null && names.has('scatter_rand') && !names.has('scatter_seed')) pre.push({ t: `scatter_seed(${opts.seed | 0})`, id: null });
  return [...pre, ...out];
}
export const gen = list => genLines(list).map(l => l.t + '\n').join('');
export const usesNoGC = l => l.some(b => BLOCKS[b.t]?.nogc || (b.body && usesNoGC(b.body)));
export const usesInput = l => l.some(b => BLOCKS[b.t]?.input || (b.body && usesInput(b.body)));
// The newest Cob version any block in the script needs (null if it needs nothing special).
export function minCob(l, best = null) {
  for (const b of l) {
    const n = BLOCKS[b.t]?.needs; if (n && (!best || !atLeast(best, n))) best = n;
    if (b.body) best = minCob(b.body, best);
  }
  return best;
}
// '0.0.8' >= '0.0.7' style comparison for the Cob version the WASM build reports.
export function atLeast(v, min) {
  const n = x => String(x).trim().split('.').map(p => parseInt(p, 10) || 0), a = n(v), m = n(min);
  for (let i = 0; i < 3; i++) { if ((a[i] || 0) !== (m[i] || 0)) return (a[i] || 0) > (m[i] || 0); }
  return true;
}
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
    if (b.t === 'lib' && !LIB_FNS.includes(o.fn)) o.fn = LIB_FNS[0];
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
const niceName = t => t === 'elif' ? 'else if' : t;
const IDENT = /^[A-Za-z_]\w*$/, PARAMS = /^\s*(?:[A-Za-z_]\w*(?:\s*,\s*[A-Za-z_]\w*)*)?\s*$/;
const RESERVED = ['pop', 'set', 'while', 'if', 'elif', 'else', 'shuck', 'extern', 'recipe', 'serve', 'harvest', 'trash'];
// boxes that are allowed to be empty (a missing prompt, no arguments, a bare serve)
const EMPTY_OK = { call: ['b'], extern: ['b'], ask: ['b'], asknum: ['b'], lib: ['b'], run: ['b'], recipe: ['b'], serve: ['a'] };
const recipeBlocks = (l, out = []) => { for (const b of l) { if (b.t === 'recipe') out.push(b); if (b.body) recipeBlocks(b.body, out); } return out; };
export function lint(list, out = [], ctx = { top: true, inRecipe: false, all: list, root: true }) {
  if (ctx.root && usesInput(list) && modulesUsed(emit(list, '', []).map(l => l.t)).includes('almanac')) {
    const ask = (function f(l) { for (const b of l) { if (BLOCKS[b.t]?.input) return b; const r = b.body && f(b.body); if (r) return r; } })(list);
    out.push({ id: ask.id, level: 'warn', text: 'Clock functions and questions do not mix well here.', hint: 'Pounce runs your program again from the top after every answer, so the time changes between runs. Take the almanac_ calls out, or the ask blocks.' });
  }
  for (const [i, b] of list.entries()) {
    const d = BLOCKS[b.t]; if (!d) continue;
    if ((b.t === 'elif' || b.t === 'else') && !['if', 'elif'].includes(list[i - 1]?.t))
      out.push({ id: b.id, level: 'error', text: `An ${niceName(b.t)} block must come right after an if block.`, hint: 'Drag it so it sits directly under an if (or else if) block, lined up with it and not inside it. Only one else is allowed per if.' });
    const boxes = d.parts.filter(p => p.k && p.k !== 'fn');
    if (b.t !== 'note' && boxes.some(p => !(EMPTY_OK[b.t] || []).includes(p.k) && !String(b[p.k] ?? '').trim()))
      out.push({ id: b.id, level: 'error', text: 'A block has an empty box.', hint: 'Fill in every box, or delete the block.' });
    if (boxes.some(p => quotes(String(b[p.k] ?? '')) % 2))
      out.push({ id: b.id, level: 'error', text: 'A quote mark " is missing.', hint: 'Words need a quote at the start and the end, like "Hello".' });
    if (['set', 'harvest', 'ask', 'asknum', 'lib'].includes(b.t) && b.a.trim() && !IDENT.test(b.a.trim()))
      out.push({ id: b.id, level: 'warn', text: `"${b.a.trim()}" may not work as a variable name.`, hint: 'Use one word with letters, numbers and _ only, like score or my_score.' });
    if (b.t === 'recipe') {
      const name = b.a.trim();
      if (name && !IDENT.test(name))
        out.push({ id: b.id, level: 'error', text: `"${name}" can't be the name of a recipe.`, hint: 'Use one word with letters, numbers and _ only, like add or say_hello.' });
      else if (MODULE_OF[name] || RESERVED.includes(name))
        out.push({ id: b.id, level: 'error', text: `"${name}" is already a name Cob uses.`, hint: 'Pick a different name for your recipe.' });
      if (!PARAMS.test(b.b))
        out.push({ id: b.id, level: 'error', text: 'The inputs of a recipe are not written correctly.', hint: 'List one-word names separated by commas, like a, b. Leave the box empty for a recipe with no inputs.' });
      else if (new Set(b.b.split(',').map(x => x.trim()).filter(Boolean)).size !== b.b.split(',').map(x => x.trim()).filter(Boolean).length)
        out.push({ id: b.id, level: 'error', text: 'Two inputs of this recipe have the same name.', hint: 'Give each input its own name, like a, b.' });
      if (!ctx.top)
        out.push({ id: b.id, level: 'error', text: 'A recipe block must sit at the top, not inside another block.', hint: 'Drag it out so it is not inside a while, if or recipe block.' });
      if (name && recipeBlocks(ctx.all).find(x => x.a.trim() === name) !== b)
        out.push({ id: b.id, level: 'error', text: `Two recipes are both called "${name}".`, hint: 'Give each recipe its own name.' });
      if (!b.body.length) out.push({ id: b.id, level: 'error', text: 'This recipe block has nothing inside it.', hint: 'Drag blocks into it. A recipe needs at least one block.' });
    }
    if (b.t === 'serve' && !ctx.inRecipe)
      out.push({ id: b.id, level: 'error', text: 'A serve block only works inside a recipe block.', hint: 'Drag it into the recipe it belongs to.' });
    if (b.t === 'run' && b.a.trim() && !IDENT.test(b.a.trim()))
      out.push({ id: b.id, level: 'error', text: `"${b.a.trim()}" isn't a recipe name.`, hint: 'Type the name of one of your recipe blocks.' });
    if (d.c && !b.body.length && b.t !== 'recipe') out.push(b.t === 'while'
      ? { id: b.id, level: 'warn', text: 'This while block has nothing inside it.', hint: 'Drag blocks into it, and make sure one changes something so the loop can stop.' }
      : { id: b.id, level: 'warn', text: `This ${niceName(b.t)} block has nothing inside it.`, hint: 'Drag blocks into it, or delete the block.' });
    if (b.body) lint(b.body, out, { top: false, inRecipe: ctx.inRecipe || b.t === 'recipe', all: ctx.all });
  }
  return out;
}
