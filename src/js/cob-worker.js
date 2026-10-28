// Runs one Cob program in a fresh cob_interp WASM instance (same MODULARIZE/EXIT_RUNTIME pattern as
// Cob's own docs/play page). Terminating this worker stops a runaway script.
// porch_ask() / porch_ask_int(): the page replays the program with the answers so far (see session.js). Answers are fed to
// stdin one line per read; when the program asks for one we don't have, we report 'need' (with the
// unfinished prompt line) and the page stops this worker.
importScripts('../wasm/cob_interp.js');
const dec = new TextDecoder(), enc = new TextEncoder();
onmessage = async e => {
  const { code, modules, noGC, inputs = [] } = e.data;
  let halted = false;
  const post = (k, t) => { if (!halted) postMessage({ k, t }); };
  // Output arrives byte by byte so a prompt with no newline, like porch_ask("Name? "), can be seen.
  const sink = k => {
    let b = [];
    const take = () => { const s = dec.decode(new Uint8Array(b)); b = []; return s; };
    return { take, put: c => { if (c == null) return; c &= 255; if (c === 10) post(k, take()); else b.push(c); } };
  };
  const so = sink('out'), se = sink('err');
  let n = 0, cur = null, at = 0, eol = false;
  const stdin = () => {
    if (eol) { eol = false; return null; }                  // end this read after each line, like a terminal
    if (!cur) {
      if (n >= inputs.length) { post('need', so.take()); halted = true; return null; }
      const a = inputs[n++]; cur = enc.encode(a + '\n'); at = 0;
      post('out', so.take() + a);                           // echo: the prompt and the answer on one line
    }
    const c = cur[at++]; if (at >= cur.length) { cur = null; eol = true; }
    return c;
  };
  try {
    const M = await createCobModule({
      stdin, stdout: so.put, stderr: se.put,
      print: l => post('out', l), printErr: l => post('err', l),   // fallbacks if a build ignores stdout/stderr
      locateFile: f => new URL('../wasm/' + f, self.location.href).href,
    });
    for (const [name, s] of Object.entries(modules)) M.FS.writeFile('/' + name + '.cob', s);
    M.FS.writeFile('/program.cob', code);
    M.callMain(['/program.cob', '--no-cache', ...(noGC ? ['--no-gc'] : [])]);
  } catch (x) {
    if (!(x && typeof x.status === 'number')) post('fatal', 'Could not run the WebAssembly build: ' + x);
    else if (x.status) post('sys', '(exited with status ' + x.status + ')');
  }
  const rest = so.take(); if (rest) post('out', rest);
  postMessage({ k: 'done' });
};
