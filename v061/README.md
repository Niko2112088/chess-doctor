# Chess Doctor v0.6.1 RC — Learning Edition

Open `index.html` through a static HTTP server (Worker/WASM requires HTTP/HTTPS).
Candidate URL after merge and Pages deployment:
https://niko2112088.github.io/chess-doctor/v061/ . The public v050 candidate remains unchanged.

Two learning paths share chess.js, EvaluationService, board rendering and the
Analysis scanner: **Разобрать мою партию** and **Учиться у гроссмейстеров**.
My Game retains Doctor, Try Again and Detective's shared issues. The library
contains 25 legally replayed, cross-checked factual game scores, with player,
theme and era filters. Each game has a complete machine-readable source manifest.

Master Lesson lets you replay the whole game immediately, read moves in Russian,
open notation on demand, analyse and jump to confirmed moments, rotate the board,
and choose a legal move in “Попробуй найти ход гроссмейстера”. Promotion offers
queen/rook/bishop/knight. Another comparably strong move is accepted; feedback
always describes the actual attempt. Historical identity and engine quality are
separate: finding a master mistake does not imply it was the strongest choice.

Analysis uses cloud cache when available, local Stockfish 19 Lite otherwise.
The fast pass uses depth 9; candidate pairs are rechecked at depth 14 (at most 12
for a whole master game), with up to six spaced teaching moments and no minimum.
Doctor keeps its existing 24-ply segment and thresholds. Attempt comparisons use
local depth 12 for all three positions. Scores are normalized to White POV;
checkmate, stalemate and insufficient material are recognized explicitly.
No backend or account is required. Evaluations survive cancellation in session
memory and are shared between paths. The local engine starts only when needed;
progress and stop controls remain available while its Worker runs.

Sources and data methodology: [data/SOURCES.md](data/SOURCES.md).
Release evidence and device checklist: [QA.md](QA.md).

## Tests

From the repository root, run the four AGENTS.md commands for the preserved
baseline, and repeat them with `APP_VERSION=v061`:

```sh
node tests/static-files.cjs
node tests/contract-tests.cjs
node tests/engine-smoke.cjs
node tests/qa.cjs
APP_VERSION=v061 node tests/static-files.cjs
APP_VERSION=v061 node tests/contract-tests.cjs
APP_VERSION=v061 node tests/engine-smoke.cjs
APP_VERSION=v061 node tests/qa.cjs
node tests/library.cjs
node tests/master-analysis.cjs
npm ci
npx playwright install --with-deps chromium
node tests/browser.cjs
```

Node-only checks need no install. Browser QA uses the pinned Playwright dev
dependency; `CHROMIUM_PATH=/usr/bin/chromium` can select an existing desktop
Chromium. CI runs both version regressions, learning tests and real Chromium
with a GitHub Pages project-path prefix. Browser screenshots are CI artifacts.

## Limits for acceptance

This is an RC, not a promotion of the public build. A real iPhone Safari and the
published Pages URL still need manual acceptance. Chromium at 375px proves the
responsive layout and actual browser Worker/WASM loading, not Safari behavior.
Analysis is bounded and intentionally conservative; a quiet game can have zero
moments, and long games can take time on a phone. Subtle positions get an explicit
uncertainty explanation. This release does not claim exhaustive tactical proof,
unique best moves or original historical research. Scores and recommendations
may vary with search depth and engine cache. No third-party lesson text is bundled.


## v0.6.1 quality patch

Real iPhone Safari acceptance of v0.6.0 exposed a Master Lesson contradiction. This candidate fixes lesson semantics and keeps v0.6.0 preserved at `/v060/`.

- `Сильный ход` asks the learner to find a strong move.
- `Ошибка` / `Шанс был упущен` asks for a stronger move instead of reproducing the historical error.
- Guess comparison uses the confirmed moment depth and reference best move.
- Generic `гроссмейстер` wording is removed from individual challenges.
- Routine pawn captures and immediate recaptures are filtered out of `Сильный ход` moments.
