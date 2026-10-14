# Chess Doctor v0.6.3 RC — QA

## Real-iPhone feedback addressed
1. Knight silhouette still looked too angular / dragon-like at phone size.
2. The lesson header did not state how long the game lasted.
3. Replay status used ply count as if it were full chess moves.

## Automated checks
- Opera Game lesson metadata contains `17 ходов` for 33 plies.
- After the first ply, replay text says `После 1-го хода белых`.
- Existing v050/v060/v061/v062 regressions stay green.
- Browser/mobile Master Lesson and Guess flow stay green.

## Manual iPhone check
- Open `/v063/` and the Opera Game.
- Confirm the metadata line includes `17 ходов`.
- Confirm the knight reads immediately as a standard chess knight/horse.
- Step through a move and confirm the progress sentence is natural.
