const fs = require('fs');
const path = require('path');
const assert = require('assert');

const app = path.resolve(__dirname, '../v050');
const required = [
  'index.html',
  'evaluation-service.js',
  'vendor/chess.js',
  'vendor/chess.LICENSE',
  'vendor/stockfish-19-lite-single.js',
  'vendor/stockfish-19-lite-single.wasm',
  'vendor/stockfish.AUTHORS',
  'vendor/stockfish.COPYING.txt'
];

for (const rel of required) {
  const p = path.join(app, rel);
  assert(fs.existsSync(p), `missing required asset: ${rel}`);
  assert(fs.statSync(p).size > 0, `empty required asset: ${rel}`);
}

const html = fs.readFileSync(path.join(app, 'index.html'), 'utf8');
const service = fs.readFileSync(path.join(app, 'evaluation-service.js'), 'utf8');

assert(html.includes('evaluation-service.js'), 'index.html does not load evaluation-service.js');
assert(html.includes('vendor/chess.js'), 'index.html does not load local chess.js');
assert(service.includes('stockfish-19-lite-single.js'), 'evaluation service does not reference Stockfish Lite');
assert(fs.statSync(path.join(app, 'vendor/stockfish-19-lite-single.wasm')).size > 1_000_000,
  'Stockfish WASM looks unexpectedly small');

console.log('required GitHub Pages assets: pass');
