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
npm test        # block codegen + .pounce format tests (Node 18+)
```

## Made for beginners
- **Friendly errors** (`src/js/errors.js`): Cob's messages are rewritten in plain words with a hint, the original is kept in small
  text, and the block that caused the error gets a red outline. `lint()` in `blocks.js` catches empty boxes and missing quotes before Cob runs.
- **Examples** menu (`src/js/examples.js`, including if/else and else-if examples), **Simple blocks** mode (hides memory and desktop-only blocks), and a first-visit help card.

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
