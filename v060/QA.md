# v0.6.0 RC QA / acceptance report

Date: 2026-10-11. Base: `main` at
`63f35b56a598be56537c1c991dce73c2c84b1484`.
Branch: `work/v060-learning-edition`. Issue: #2.

## Automated evidence

- Four AGENTS.md commands pass for the original v050 and for v060 using
  `APP_VERSION=v060`: static assets, cloud contracts, real Stockfish smoke and
  full Doctor / Try Again / Detective regression.
- My Game regression includes white/black play, check-response restrictions,
  removed-defender positions, side invalidation, PGN replacement and broken PGN,
  cloud hit, cloud miss and network failure with local fallback.
- `node tests/library.cjs`: 25 distinct factual PGNs parse and replay completely;
  all required player families, metadata and per-game source manifests exist;
  no annotations, complete canonical move checksums match research-time records.
- `node tests/master-analysis.cjs`: real white win, black win, draw/quiet and mate
  fixtures; full Opera Game; equal-depth rechecking, legal recommendations, no
  forced quiet moments, exact / alternative strong / playable / weak attempts,
  rejected illegal attempt, actual returned attempt, terminal POV, session cache
  and cancellation guards.
- `node tests/browser.cjs`: real Chromium desktop 1280×900 and viewport 375×812.
  Served under `/chess-doctor/v060/` with network errors injected for cloud eval.
  Verified relative JS/JSON/Worker/WASM responses, 25 cards and filters, full local
  master scan, stop/restart, illegal target rejection, exact guess and no repeated
  recommendation, reveal, coordinates/orientation, My Game/Detective switching,
  PGN replacement and no stale result after leaving analysis. No page errors or
  horizontal overflow. Screenshot emitted to `test-results/mobile-lesson.png`.

The browser test launches an actual desktop Chromium and real WASM Worker. It is
not a real iPhone test. Cloud-hit cases are deterministic API fixtures; they do
not assert availability of the live Lichess API. Local fallback uses the bundled
Stockfish WASM in both Node and Chromium.

CI repeats both version regressions plus learning and browser jobs. The PR is the
review/acceptance boundary, not a merge or public build promotion.

## Diff review

v050 and root/historical app files remain unchanged. v060 vendors are exact
copies including licenses. Changes outside v060 are limited to tests, pinned
browser test dependency/lockfile, CI, .gitignore and README. The My Game scanner
was moved into Analysis without changing its thresholds/24-ply window; Detective
still reads the same `state.issues` as Doctor. Master-specific moment labels use
the same scores, recommendation validation and pair recheck, with more conservative
teaching thresholds. All recommendations are checked in the exact position.

## Known limits

- Real iPhone Safari and the actual published Pages URL require the checklist
  below before public release. They were not tested on an actual iPhone.
- Bounded analysis is intentionally selective: depth 9 scan, up to 12 depth 14
  candidate pairs for master games, at most six spaced moments, no minimum count.
  This is not exhaustive game annotation or proof that a move is uniquely best.
- Full games (the longest is 229 plies) can take longer on phones. Progress and
  cancellation are provided. A subtle position gets an uncertainty explanation
  rather than invented tactical causality.
- Historical exact-match success confirms move identity; if equal-budget analysis
  finds it materially weaker, the feedback explicitly says there were stronger
  options. Alternate attempts are judged against the engine, not mere identity.
- Library corroborating collections may share upstream scores. Each score was
  compared across two records, but independent historical research is not claimed.
- Session caches are memory-only. Reloading loses them. No offline service worker
  is provided; the initial app/assets must load through HTTP/HTTPS.

## Manual iPhone Safari checklist — NOT YET RUN

Record device model, iOS/Safari version, URL, date, and result of every item.
Use a real iPhone on the candidate's static HTTPS deployment.

- [ ] Open `/chess-doctor/v060/` directly and after reload; JS, JSON, Worker and
      WASM return 200 from the project prefix; no console error.
- [ ] Test portrait and landscape, safe-area insets, scroll, text zoom/pinch zoom;
      no horizontal page overflow or clipped cards, filters, board or controls.
- [ ] Open the library; check 25 games, player/theme/era filters, empty-filter
      result and return to the library.
- [ ] Open Morphy; replay previous/next through the end, check player sides and
      turn, visible coordinates, board rotation and optional notation disclosure.
- [ ] Start cold local analysis with cloud unavailable; progress updates, UI and
      scroll respond; Stop returns promptly; restart finishes without stale results.
- [ ] Open a long game (Caruana–Carlsen 2018) and repeat stop/restart; watch memory,
      thermal behavior and responsiveness. Leave to My Game while it analyses.
- [ ] Jump to a key moment; read the explanation and verify quiet positions don't
      promise a fixed number of mistakes or invented causal stories.
- [ ] Guess the move via two taps; legal destinations highlighted; illegal target
      and non-check response rejected. Verify no game move requires SAN/UCI entry.
- [ ] Check exact master move, another strong legal move, a weaker move, reveal,
      retry and promotion to each figure. Feedback describes the actual attempt;
      exact success does not repeat a recommendation.
- [ ] My Game: both sides, bottom orientation/coordinates, Doctor, Try Again and
      Detective; best moves legal; selecting another side clears previous analysis.
- [ ] Replace PGN and start-move field; old results disappear. Broken PGN reports
      an error and permits recovery. Stop My Game analysis and retry.
- [ ] Verify cloud hit fast path; cloud miss/offline/rate limit fall back locally.
      Failure to start a Worker reports an actionable error and permits retry.
- [ ] Switch repeatedly between paths/games during analysis or attempted-move
      scoring; no previous game/attempt feedback appears in the new view.
