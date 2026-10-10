# Work task template

Use this when handing Chess Doctor a substantial implementation task.

> Work directly from the GitHub repository `Niko2112088/chess-doctor`. Read `AGENTS.md` first and treat `v050/` as the current source of truth unless the task says otherwise.
>
> Create a new `work/<task-name>` branch from the latest `main`. Perform the task completely: inspect the existing implementation, reproduce the problem, implement the fix/feature, run the full automated test suite, fix regressions, rerun tests until green, review the final diff, and open a pull request into `main`.
>
> Do not stop after an audit, recommendations, or partial implementation. Do not rewrite the working architecture without a demonstrated need. Preserve Doctor/Detective shared analysis, Try Again behavior, legality checks, Lichess-to-local-Stockfish fallback, licenses, and mobile-first UX.
>
> Required before completion:
> - `node tests/static-files.cjs`
> - `node tests/contract-tests.cjs`
> - `node tests/engine-smoke.cjs`
> - `node tests/qa.cjs`
>
> If a test fails, diagnose, fix, and rerun. If a real external blocker remains, document the exact blocker and evidence. Do not claim manual iPhone/Safari testing unless you actually performed it.
>
> Finish by opening a PR with: summary, files changed, tests run and results, known limitations, and any manual acceptance checks still required. Do not merge the PR yourself unless explicitly instructed.
