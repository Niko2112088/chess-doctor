# Chess Doctor v0.6.8 Beta

Reference-style move animation pass based on the user-provided chess animation video.

## What changed

Visual lessons now make a move readable before, during, and after the piece travels:

- source square is highlighted;
- destination is highlighted before motion;
- a directional arrow is drawn from source to destination;
- the piece travels more slowly (~1.25 s);
- for captures, the victim is warned/highlighted and fades as the moving piece arrives;
- the final position remains on screen with the arrow still visible.

The arrow color follows the move role:
- blue — user's move;
- orange — opponent move;
- green — stronger move;
- yellow — neutral/context move.

The same animation language is used in Doctor and Master Lessons.

No engine, evaluation, issue-selection, or causality logic changed.
