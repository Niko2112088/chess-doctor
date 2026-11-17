# Chess Doctor v0.6.5 Beta

## Visual explanations

Doctor can now demonstrate an important moment directly on the board:

- user move animation;
- confirmed opponent consequence when causal evidence exists;
- stronger alternative animation;
- visual focus for confirmed removed-defender cases.

This is deliberately evidence-bound: if the next move is not a proven consequence, Doctor does not animate it as “the punishment”.

## Unchanged

Stockfish evaluation, issue selection, legality checks, Doctor/Detective shared analysis and Master Lesson logic are unchanged from v0.6.4.
