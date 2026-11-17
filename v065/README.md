# Chess Doctor v0.6.5 Beta

Visual-first teaching pass.

This build keeps the v0.6.4 chess logic and adds a second explanation channel: the board itself.

## What changed

Doctor issues now include a **“Посмотреть, а не читать”** block.

The user can run a short visual story:
1. show the position before the mistake;
2. animate the user’s move;
3. when the opponent’s reply is a proven direct consequence, animate that reply;
4. reset to the original position and animate the confirmed stronger move.

For confirmed removed-defender cases, the affected piece is highlighted after the defender leaves.

A separate **“Только сильный вариант”** button lets the user replay just the stronger move.

## Principles

- Visuals never invent a causal step that the analysis did not confirm.
- The board stays oriented with the user’s color at the bottom.
- The text explanation remains available; animation is an additional learning path, not a replacement.
- No engine thresholds or chess-analysis rules changed.

Master Lessons keep the animated move demos introduced in v0.6.4.

Older beta builds remain available, including `/v064/`.
