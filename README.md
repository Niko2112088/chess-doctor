# Chess Doctor

Beginner-focused chess review prototype: paste a PGN, find the important mistakes, understand them in plain language, and retry the position.

## Current build
- Release candidate: `v050/`
- GitHub Pages: https://niko2112088.github.io/chess-doctor/v050/
- Evaluation: Lichess Cloud Eval fast path + local Stockfish 19 Lite fallback
- Modes: Doctor, Try Again, Detective

## Development workflow
Substantial changes should be made on a `work/<task>` branch and delivered through a pull request. See `AGENTS.md`.

Run the full local automated suite from the repository root:

```bash
node tests/static-files.cjs
node tests/contract-tests.cjs
node tests/engine-smoke.cjs
node tests/qa.cjs
```

No npm install is required for the current tests.

## Release rule
A green CI run proves the automated contract/engine/QA checks only. iPhone Safari and published GitHub Pages behavior must still be manually accepted before a public release.

## Learning Edition candidate

`v060/` is the **v0.6.0 RC** candidate for Issue #2. It adds the 25-game
Grandmaster Library, Master Lesson and Guess the Move through a shared analysis
pipeline. `v050/` remains the current public build and is preserved byte-for-byte.
See [v060/README.md](v060/README.md), [QA report](v060/QA.md),
[release notes](v060/RELEASE_NOTES.md) and [data provenance](v060/data/SOURCES.md).

Repeat the existing four test commands with `APP_VERSION=v060`, then run:

```bash
node tests/library.cjs
node tests/master-analysis.cjs
npm ci
npx playwright install --with-deps chromium
node tests/browser.cjs
```

CI covers both candidates, new learning tests and real Chromium at desktop and
375px widths under a simulated GitHub Pages project path. An actual iPhone Safari
check remains a manual RC acceptance step; no real iPhone test is claimed.
