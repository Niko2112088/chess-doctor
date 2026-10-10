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
