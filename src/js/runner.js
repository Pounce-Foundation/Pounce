import { runSession } from './session.js';
// io = { ask(prompt) -> Promise<string|null>, cancel() }: the console's "type an answer" row.
export class Runner {
  constructor(on, io) { this.on = on; this.io = io; this.w = null; this.res = null; this.gen = 0; this.active = false; }
  run(code, modules, noGC) {
    this.stop(true);
    const id = this.gen; this.active = true;
    return runSession({
      once: (inputs, on) => this.once(code, modules, noGC, inputs, on),
      ask: p => this.io.ask(p), on: this.on, stopped: () => this.gen !== id,
    }).finally(() => { if (this.gen === id) this.active = false; });
  }
  once(code, modules, noGC, inputs, on) {
    return new Promise(res => {
      const w = this.w = new Worker(new URL('./cob-worker.js', import.meta.url));
      let over = false;
      const end = r => { if (over) return; over = true; w.terminate(); if (this.w === w) { this.w = null; this.res = null; } res(r); };
      this.res = () => end({});
      w.onmessage = e => { if (over) return; const m = e.data; m.k === 'done' ? end({}) : m.k === 'need' ? end({ need: { prompt: m.t } }) : on(m); };
      w.onerror = () => { on({ k: 'fatal', t: 'The WebAssembly build is missing. Run `npm run build:wasm` (see README).' }); end({}); };
      w.postMessage({ code, modules, noGC, inputs });
    });
  }
  stop(quiet) {
    const was = this.active;
    this.gen++; this.active = false;
    this.io.cancel();
    if (this.w) { this.w.terminate(); this.w = null; }
    if (this.res) { this.res(); this.res = null; }
    if (was && !quiet) this.on({ k: 'sys', t: 'Stopped.' });
  }
}
