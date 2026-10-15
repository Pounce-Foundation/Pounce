// Runs one Cob program in a fresh cob_interp WASM instance (same MODULARIZE/EXIT_RUNTIME
// pattern as Cob's own docs/play page). Terminating this worker stops a runaway script.
importScripts('../wasm/cob_interp.js');
onmessage = async e => {
  const { code, modules, noGC } = e.data, post = (k, t) => postMessage({ k, t });
  try {
    const M = await createCobModule({
      print: l => post('out', l), printErr: l => post('err', l),
      locateFile: f => new URL('../wasm/' + f, self.location.href).href,
    });
    for (const [n, s] of Object.entries(modules)) M.FS.writeFile('/' + n + '.cob', s);
    M.FS.writeFile('/program.cob', code);
    M.callMain(['/program.cob', '--no-cache', ...(noGC ? ['--no-gc'] : [])]);
  } catch (x) {
    if (!(x && typeof x.status === 'number')) post('fatal', 'Could not run the WebAssembly build: ' + x);
    else if (x.status) post('sys', '(exited with status ' + x.status + ')');
  }
  postMessage({ k: 'done' });
};
