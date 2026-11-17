# Chess Doctor v0.6.5 Beta — QA

## Automated acceptance

- all older version regressions remain green;
- v065 is included in the regression matrix;
- learning and browser suites target v065;
- Doctor exposes the visual explanation control after sample analysis;
- the first move animation renders on the real board;
- the full visual story returns to normal controls and reports completion;
- “Только сильный вариант” animates independently;
- visual playback does not flip the user’s board orientation;
- vague “Позиция тонкая” wording remains blocked.

## Manual iPhone acceptance

1. Analyze the built-in sample.
2. Open the first Doctor issue.
3. Tap **“Показать, что произошло”**.
4. Confirm the move is understandable without reading coordinates first.
5. Confirm the board never flips unexpectedly.
6. Tap **“Только сильный вариант”** and compare visually.
7. Check a confirmed defender-removal case and verify the vulnerable piece is visually emphasized.
