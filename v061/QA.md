# Chess Doctor v0.6.1 RC — QA

Patch basis: real iPhone Safari acceptance of v0.6.0 on 2026-10-14.

## Real iPhone evidence from v0.6.0
- GitHub Pages opened over 4G.
- 25-game master library rendered without horizontal overflow.
- Opera Game opened, board/replay controls worked, and local Worker/WASM analysis completed.
- Key-moment tabs rendered and Guess interaction accepted legal board moves.
- Board rotation worked.
- Acceptance exposed one logic defect: a historical move labeled `Ошибка` could later be shown as the recommended move because moment confirmation and attempt comparison used different search budgets.

## v0.6.1 fixes under automated acceptance
- Error/chance lessons target the confirmed stronger move.
- Strong lessons target the historical strong move.
- Guess comparison uses the confirmed moment depth/reference move.
- Individual challenges use neutral wording, not blanket `гроссмейстер`.
- Routine pawn captures and immediate recaptures are filtered out of strong teaching moments.
- Regression tests cover the Opera Game contradiction.

## Manual acceptance still required
- Open `/chess-doctor/v061/` on the same iPhone.
- Run the Opera Game analysis.
- Verify early `dxe5` / `Qxf3` are no longer promoted as strong teaching moments.
- Open an `Ошибка` or `Шанс был упущен` moment and confirm the button says `Найди более сильный ход`.
- Play the suggested stronger move and confirm success does not repeat the historical error as the recommendation.
- Open a `Сильный ход` moment and confirm the button says `Попробуй найти сильный ход`.
- Confirm no individual lesson calls Duke Karl / Count Isouard a grandmaster.