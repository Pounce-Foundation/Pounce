# 🌽 Pounce

Block coding for [Cob](https://github.com/Cob-Software-Foundation/Cob). Snap blocks together, see the Cob code, and run it
on a WebAssembly build of the real `cob_interp`. Made with the Cob Software Foundation and the Pouce Foundation.

## How it fits together
- `scripts/build-wasm.sh` fetches Cob (`COB_REF`: branch, tag or commit; pin one for reproducible builds) and runs Cob's own
  `make wasm` (Emscripten, `-DCOB_WASM`, no other dependencies). Output goes to `dist/wasm/`.
- `src/` is the front end (plain ES modules, no dependencies). `scripts/build-site.sh` copies it to `dist/`.
- Each run uses a fresh WASM instance in a Web Worker; **Stop** terminates the worker.
- `.github/workflows/pages.yml` builds both and deploys `dist/` to GitHub Pages (Settings → Pages → Source: GitHub Actions).

## Local use
```
npm run build   # needs Emscripten (emcc) and git
npm run dev     # http://localhost:8080
npm test        # block codegen, input replay, worker and .pounce format tests (Node 18+)
                # COB_INTERP=/path/to/Cob/bin/cob_interp npm test   also runs everything through real Cob
```

## Made for beginners
- **Friendly errors** (`src/js/errors.js`): Cob's messages are rewritten in plain words with a hint, the original is kept in small
  text, and the block that caused the error gets a red outline. `lint()` in `blocks.js` catches empty boxes and missing quotes before Cob runs.
- **Examples** menu (`src/js/examples.js`, including if/else and else-if examples), **Simple blocks** mode (hides memory and desktop-only blocks), and a first-visit help card.

## Asking questions (input)
The **Input** blocks, `set name = input("…")` and `set age = input_int("…")`, ask the person running the program to type
an answer in the Console (needs Cob 0.0.8 or newer; Pounce says so if the WASM build is older). The prompt box can be empty.
A browser can't pause a worker to wait for the keyboard, so Pounce **replays**: the run stops when the program asks, the
Console shows a box, and then the program runs again from the top with every answer so far (`src/js/session.js`). Lines that
are already on screen are not repeated, and answers are echoed like a terminal. That is safe because the browser build has no
randomness, clock or files. `cob-worker.js` feeds one answer per `read` and reports `need` when it runs out. A program that
asks more than 500 questions is stopped. A non-number typed into `input_int` gives 0 plus a friendly warning.

## Cob in the browser
`sql_*`, `window_*`, `tcl_eval` and `extern` are silent no-ops with a one-time notice in the WASM build. Pounce marks them as
desktop-only. `harvest`/`trash` need `--no-gc`, which Pounce passes automatically when a script uses them.
`if`, `else if` and `else` blocks need Cob 0.0.7 or newer (that is where Cob gained `if`/`elif`/`else`). `else if` and `else`
are separate blocks that must sit directly under an `if` (or `else if`), lined up with it. Pounce checks that before running, and
if the WASM build is older than 0.0.7 it explains that Cob is too old instead of showing a raw syntax error.

## .pounce files
A zip (like Scratch's `.sb3`): `project.json` (blocks and metadata), `main.cob` (generated program), `modules/NAME.cob` (for `shuck`).

## Licensing
Cob is source-available under PolyForm Noncommercial 1.0.0, and the deployed WASM is built from it: personal, educational and
non-profit use only. "Cob", "popcorn_comp", "farmer", "Pixel Pulse" and "CSF" are trademarks of the Cob project creators.
Add your own LICENSE for the Pounce front end.
