# Chess Doctor v0.6.4 Beta

External-test build based on v0.6.3. The chess-analysis logic is unchanged.

## Purpose

This build is meant for people who did not participate in development. The goal is to learn whether a new user can understand the product, analyze a game, and tell us where the experience or explanations fail without being coached first.

## Public-beta UX

- Header shows **Chess Doctor · Beta** instead of an internal RC version.
- First screen explains the product in one sentence and gives a 3-step start.
- A short “What is PGN?” disclosure explains what to paste and lets users know a sample is already loaded.
- Technical first-run wording is reduced.
- The second product path is labeled **Известные партии** for clearer public wording.
- A persistent **Отзыв** button opens a tiny feedback form:
  - what was unclear;
  - what looked wrong/strange;
  - whether the user would analyze another game.
- Feedback is not transmitted anywhere automatically. The user copies it and sends it back in the same place where they received the test link.

## Product invariants preserved

Doctor, Detective, Try Again, Master Lessons, local Stockfish fallback, legal-move validation, causal-explanation safeguards and v0.6.3 game-length/knight changes are unchanged.

Older candidates remain available, including `/v063/`.
