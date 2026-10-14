# Chess Doctor v0.6.2 RC — QA

## Acceptance target
Real iPhone Safari feedback on v0.6.1 showed two UX issues:
1. legal source pieces were outlined before the learner chose a piece, giving away too much;
2. the knight silhouette was hard to recognise on a small phone board.

## Automated checks
- No `.canMove` source highlights before a Master Guess selection.
- No `.unavailable` fading before a Master Guess selection.
- Legal target dots appear after selecting a movable own piece.
- Knight SVG carries a dedicated piece marker and enlarged mobile silhouette.
- Existing v050/v060/v061 regressions remain green.

## Manual iPhone checklist
- Open a Master Lesson guess in `/v062/`.
- Confirm no pieces are pre-highlighted before selection.
- Tap a movable own piece: only legal destination squares should highlight.
- Tap the selected piece again: selection should clear.
- Tap an opponent or immobile piece: receive a short explanation, without revealing the correct piece.
- Confirm the knight reads immediately as a horse/knight at normal phone zoom.
