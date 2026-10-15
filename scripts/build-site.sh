#!/bin/sh
# Copies the front end into dist/. Leaves dist/wasm/ alone.
set -eu
cd "$(dirname "$0")/.."
mkdir -p dist
rm -rf dist/js dist/css dist/index.html
cp -r src/js src/css src/index.html dist/
echo "Site copied to dist/"
