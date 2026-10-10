# Chess Doctor — agent instructions

## Source of truth
- Current release candidate: `v050/`.
- The public test build is served from GitHub Pages at `/chess-doctor/v050/`.
- Older root files (`v02.html`, `v029.html`, etc.) are historical snapshots. Do not edit or delete them unless the task explicitly asks for archival cleanup.
- Do not replace the repository root `index.html` unless the task explicitly asks to promote a release.

## Required workflow for substantial tasks
1. Read this file, the current app code, and relevant tests before changing anything.
2. Create a new branch from the latest `main` named `work/<short-task-name>`.
3. Implement the task completely. Do not stop after audit, recommendations, or a partial patch.
4. Run the full automated suite:
   - `node tests/static-files.cjs`
   - `node tests/contract-tests.cjs`
   - `node tests/engine-smoke.cjs`
   - `node tests/qa.cjs`
5. If a test fails, diagnose the cause, fix it, and rerun until it passes or a real external blocker is proven.
6. Review the diff for accidental regressions and unrelated changes.
7. Open a pull request to `main` with a concise summary, test results, and known limitations.
8. Do not merge the PR unless the user explicitly asks for the merge.

## Product invariants
- Target user: beginner or returning chess player. Main explanations should avoid chess-engine jargon and notation unless it is hidden behind technical details.
- Doctor and Detective must use the same analysis/issues source. Never create a second independent blunder detector for Detective.
- Try Again must evaluate and describe the move the user actually played.
- The board is oriented with the user's side at the bottom and coordinates remain visible.
- Recommendations must be legal in the exact position.
- In check, only legal check responses may be selectable.
- `attacked != hanging`. Do not claim a defended piece is simply lost.
- Preserve removed-defender reasoning where a move abandons protection of another piece/pawn.
- Do not invent causal links between the user's move and the opponent's next move.
- Do not force a fixed number of mistakes. Zero or one trustworthy moment is better than noisy findings.
- If a reliable plain-language explanation cannot be established, say so instead of inventing one.
- Do not use material delta as the primary blunder detector.

## Evaluation architecture
- Lichess Cloud Eval is a fast path/cache, not a hard dependency.
- Cloud miss, incomplete response, rate limit, timeout, or network failure must fall back to local Stockfish.
- Current local engine: Stockfish 19 Lite Worker/WASM in `v050/vendor/`.
- Normalize cloud and local scores consistently, including side-to-move and mate values.
- Validate any displayed best move with chess.js before showing it.

## Scope discipline
- Prefer minimal changes to the existing working architecture.
- Do not rewrite the app in React/Vue or add a backend unless explicitly requested.
- Do not add accounts, subscriptions, Chess DNA, social features, or unrelated redesigns during bugfix/QA tasks.
- Preserve Stockfish/chess.js licenses and notices.

## Testing honesty
- Automated Node tests do not prove iPhone Safari/Worker/WASM behavior.
- Never claim a manual browser/device test passed unless it was actually performed in that environment.
- Browser/mobile-specific work must end with a clearly stated manual acceptance checklist if that environment is unavailable.
