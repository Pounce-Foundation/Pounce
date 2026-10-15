#!/usr/bin/env bash
# Builds cob_interp from Cob's own source into WebAssembly via `make wasm`
# (src/file_io.c + src/cob_interp.c only, -DCOB_WASM: no SQLite/Tcl/Tk/raylib).
# Needs Emscripten (emcc on PATH or EMCC=/path/to/emcc). CI pins emsdk 4.0.17.
set -euo pipefail
cd "$(dirname "$0")/.."
REF="${COB_REF:-$(tr -d '[:space:]' < COB_REF)}"
REPO="${COB_REPO:-https://github.com/Cob-Software-Foundation/Cob.git}"
rm -rf .cob-src && mkdir .cob-src
git -C .cob-src init -q
git -C .cob-src fetch -q --depth 1 "$REPO" "$REF"   # branch, tag or commit SHA
git -C .cob-src checkout -q FETCH_HEAD
make -C .cob-src wasm EMCC="${EMCC:-emcc}"
mkdir -p dist/wasm
cp .cob-src/bin/wasm/cob_interp.js .cob-src/bin/wasm/cob_interp.wasm dist/wasm/
cp .cob-src/VERSION dist/wasm/version.txt
cp .cob-src/LICENSE.md dist/wasm/COB-LICENSE.md
# Cob's Makefile warns that a mismatched toolchain can "succeed" with a near-empty .wasm.
[ "$(wc -c < dist/wasm/cob_interp.wasm)" -gt 20000 ] || { echo "cob_interp.wasm is suspiciously small; check your Emscripten install" >&2; exit 1; }
echo "Built Cob $(cat dist/wasm/version.txt) ($REF) -> dist/wasm/"
