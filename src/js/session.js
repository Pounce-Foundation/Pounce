// A browser can't pause a worker to wait for the keyboard, so input() works by replaying: run the
// program, and when it asks for a line stop it, ask the person, then run it again from the top with
// every answer so far. Output that is already on screen is skipped, so it looks like one continuous
// run. This is safe because a run is repeatable: the browser build has no files, Pounce seeds scatter_rand once
// per Run click (see genLines), and the clock library (almanac) is not offered as blocks, so the same answers
// always give the same run. DOM-free (tested in Node).
export const MAX_ANSWERS = 500;
const oneLine = a => String(a ?? '').replace(/[\r\n]+/g, ' ');
// once(inputs, on) -> Promise<{ need?: { prompt } }>   runs the program once, calling on(msg) for each message
// ask(prompt)      -> Promise<string | null>           null means the person pressed Stop
export async function runSession({ once, ask, on, stopped = () => false }) {
  const inputs = []; let shown = 0;
  while (!stopped()) {
    const base = shown; let n = 0;
    const r = await once(inputs.slice(), m => {
      if (m.k === 'out' || m.k === 'err') { if (n++ < base) return; shown++; }
      on(m);
    });
    if (stopped() || !r || !r.need) return;
    if (inputs.length >= MAX_ANSWERS) { on({ k: 'sys', t: `(stopped: the program asked more than ${MAX_ANSWERS} questions)` }); return; }
    const a = await ask(r.need.prompt);
    if (a == null || stopped()) return;
    inputs.push(oneLine(a));
  }
}
