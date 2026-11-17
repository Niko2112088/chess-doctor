# Chess Doctor v0.6.6 Beta

Guided visual lesson pass.

This build keeps v0.6.5 chess truth and visual explanations, but changes the interaction so a beginner controls the pace.

## Guided lesson

Tapping **“Показать на доске”** now:

1. scrolls the screen back to the chessboard automatically;
2. shows a compact lesson panel directly above the board;
3. starts on **Шаг 1 из N** instead of immediately playing everything;
4. lets the user move through the explanation with **Назад / Дальше**;
5. keeps **Автопоказ** as an optional secondary mode.

Doctor move animation is deliberately slower (~1 second) and the autoplay holds each result before continuing.

The guided lesson can include:
- starting position;
- the user’s move;
- a separate “what changed” step for confirmed removed-defender cases;
- a proven direct opponent reply;
- the confirmed stronger alternative.

No causal step is invented.

## UX rules

- Player color remains at the bottom.
- The user never has to manually scroll back to find the animation.
- Visual controls stay adjacent to the board.
- Manual stepping is the default learning experience.
- Existing text remains available below.

Older builds remain preserved, including `/v065/`.
