#!/usr/bin/env bash
# Builds Cob's browser module from Cob's own source, with Cob's `make wasm`
# (crates/cob-wasm compiled to wasm32-unknown-unknown by Cargo). Output: dist/wasm/.
#
# Needs: git, make, cargo, and the wasm target:  rustup target add wasm32-unknown-unknown
# The page loads the module through Cob's docs/play/cob_interp.js. That file needs a
# fix to run inside a Web Worker, which is what scripts/cob-glue-worker.patch does.
# The patch is applied to the fetched source unless it is already there.
set -euo pipefail
cd "$(dirname "$0")/.."
PATCH="$PWD/scripts/cob-glue-worker.patch"
REF="${COB_REF:-$(tr -d '[:space:]' < COB_REF)}"
REPO="${COB_REPO:-https://github.com/Cob-Software-Foundation/Cob.git}"

rm -rf .cob-src && mkdir .cob-src
git -C .cob-src init -q
git -C .cob-src fetch -q --depth 1 "$REPO" "$REF"   # branch, tag or commit SHA
git -C .cob-src checkout -q FETCH_HEAD

if patch -d .cob-src -p1 -R --dry-run -s < "$PATCH" >/dev/null 2>&1; then
    echo "glue fix already present in $REF"
else
    patch -d .cob-src -p1 < "$PATCH"
fi

make -C .cob-src wasm

mkdir -p dist/wasm
cp .cob-src/bin/wasm/cob_interp.wasm .cob-src/docs/play/cob_interp.js dist/wasm/
cp .cob-src/VERSION dist/wasm/version.txt
cp .cob-src/LICENSE.md dist/wasm/COB-LICENSE.md
# A wrong toolchain can still "succeed" and leave a near-empty module; refuse it.
[ "$(wc -c < dist/wasm/cob_interp.wasm)" -gt 20000 ] || { echo "cob_interp.wasm is suspiciously small" >&2; exit 1; }
echo "Built Cob $(cat dist/wasm/version.txt) ($REF) -> dist/wasm/"
