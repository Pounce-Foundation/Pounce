export class Runner {
  constructor(on) { this.on = on; this.w = null; this.res = null; }
  run(code, modules, noGC) {
    this.stop(true);
    return new Promise(res => {
      this.res = res;
      const w = this.w = new Worker(new URL('./cob-worker.js', import.meta.url));
      const end = () => { w.terminate(); if (this.w === w) { this.w = null; this.res = null; } res(); };
      w.onmessage = e => e.data.k === 'done' ? end() : this.on(e.data);
      w.onerror = () => { this.on({ k: 'fatal', t: 'The WebAssembly build is missing. Run `npm run build:wasm` (see README).' }); end(); };
      w.postMessage({ code, modules, noGC });
    });
  }
  stop(quiet) {
    if (!this.w) return;
    this.w.terminate(); this.w = null;
    if (!quiet) this.on({ k: 'sys', t: 'Stopped.' });
    if (this.res) { this.res(); this.res = null; }
  }
}
