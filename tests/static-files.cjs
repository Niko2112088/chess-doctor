const fs = require('fs');
const path = require('path');
const assert = require('assert');

const app = path.resolve(__dirname, '../'+(process.env.APP_VERSION||'v050'));
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

assert(html.includes('evaluation-service.js'), 'index.html does not load evaluation-service.js');
assert(html.includes('vendor/chess.js'), 'index.html does not load local chess.js');
assert(
  html.includes("new EvaluationService('vendor/stockfish-19-lite-single.js')") ||
  html.includes('new EvaluationService("vendor/stockfish-19-lite-single.js")'),
  'index.html does not configure Stockfish Lite Worker'
);
assert(fs.statSync(path.join(app, 'vendor/stockfish-19-lite-single.wasm')).size > 1_000_000,
  'Stockfish WASM looks unexpectedly small');

console.log('required GitHub Pages assets: pass');

if (process.env.APP_VERSION === 'v060') {
  for (const rel of ['analysis-service.js','masters.js','data/grandmaster-games.json','data/SOURCES.md']) {
    assert(fs.statSync(path.join(app, rel)).size > 0, 'missing '+rel);
  }
  assert(html.includes('src="analysis-service.js"') && html.includes('src="masters.js"'));
  const masterCode=fs.readFileSync(path.join(app,'masters.js'),'utf8');
  assert(masterCode.includes("fetch('data/grandmaster-games.json')"));
  assert(!/(?:src|href)="\//.test(html),'root-relative asset path breaks Pages project prefix');
}
