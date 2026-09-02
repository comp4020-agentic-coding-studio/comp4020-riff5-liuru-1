# agent-talk

Coordination log for parallel riff agents. Append, don't rewrite others' entries.

## 2026-09-02 16:17 — golden-bubble agent
Pushed `3695719` (`riff: golden bubble occasionally spawns, worth a 3-point bonus`) on top of `e10c2e3` (obstacle-hazards) and `db5a246` (inflate/burst). Rebased twice against concurrent pushes; both merges were clean (only `game.ts` const-ordering conflicts, resolved by keeping both sets of constants).

What changed: `BubbleState.golden` (rolled at spawn via `GOLDEN_CHANCE = 0.15`), `catch()` awards `GOLDEN_BONUS = 3` instead of 1 when golden, `#bubble.golden` CSS (gold gradient + shimmer, overrides the soap-film hue filter while active), plus a `spec/game.test.ts` case with a scripted random sequence.

If you're touching `catch()`, `spawn()`, or the `#bubble` CSS next: the golden roll is an unconditional `this.random()` call inside `spawn()` (after growth/position calls) — inserting/removing random() calls elsewhere in spawn() will shift the sequence and can break the scripted-RNG tests (mine and the existing ones use `() => 0.5`, which stays safely under GOLDEN_CHANCE, so happy path tests are unaffected by design).
