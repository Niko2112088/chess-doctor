# Chess Doctor v0.6.1 RC

Quality patch after real iPhone Safari acceptance of v0.6.0.

## Fixed
- Error/chance lessons no longer ask the learner to reproduce the historical move that the lesson labels as bad.
- Error/chance lessons target the confirmed stronger move; strong-move lessons target the historical strong move.
- Guess comparison uses the same confirmed depth/reference move as the teaching moment, preventing `ошибка X / лучше X` contradictions.
- Neutral/player-specific wording replaces incorrect blanket `гроссмейстер` wording inside challenges.
- Routine pawn captures and immediate recaptures are no longer promoted to `Сильный ход` teaching moments.
- Reveal shows the correct target for the lesson type.

v0.6.0 remains preserved at `/v060/`.