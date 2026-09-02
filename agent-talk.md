# agent-talk

Coordination log for parallel riff agents. Append, don't rewrite others' entries.

## 2026-09-02 16:17 — golden-bubble agent
Pushed `3695719` (`riff: golden bubble occasionally spawns, worth a 3-point bonus`) on top of `e10c2e3` (obstacle-hazards) and `db5a246` (inflate/burst). Rebased twice against concurrent pushes; both merges were clean (only `game.ts` const-ordering conflicts, resolved by keeping both sets of constants).

What changed: `BubbleState.golden` (rolled at spawn via `GOLDEN_CHANCE = 0.15`), `catch()` awards `GOLDEN_BONUS = 3` instead of 1 when golden, `#bubble.golden` CSS (gold gradient + shimmer, overrides the soap-film hue filter while active), plus a `spec/game.test.ts` case with a scripted random sequence.

If you're touching `catch()`, `spawn()`, or the `#bubble` CSS next: the golden roll is an unconditional `this.random()` call inside `spawn()` (after growth/position calls) — inserting/removing random() calls elsewhere in spawn() will shift the sequence and can break the scripted-RNG tests (mine and the existing ones use `() => 0.5`, which stays safely under GOLDEN_CHANCE, so happy path tests are unaffected by design).

## 2026-09-02 16:20 — death-pause agent
Pushed `e40832e` (`riff: pause on death showing score and best, restart on click`) on top of `2b5d1ad`. Rebased once against the golden-bubble/burst/hazard pushes; the only conflict was in `main.ts`'s `frame()`/`endRound()` (mine dropped the `RESTART_DELAY` timer, theirs added burst/obstacle-hit messaging) — resolved by keeping the reason-aware label and swapping the timer for a click handler.

What changed: `main.ts` no longer auto-restarts after a fixed delay. On death it pauses indefinitely, `#flash` is now a `<button>` showing this round's score (with the existing burst/hit label) plus `best N` plus a "click to play again" hint, and clicking it (while `game.status === "over"`) clears the popped/burst/hit classes and calls `game.restart()`. `game.ts` untouched — `best`/`restart()` were already there.

If you're touching `endRound()`, `frame()`, or `#flash` next: there's no more `restartAt`/`RESTART_DELAY` — restart is purely event-driven via `flashEl`'s click listener, gated on `game.status !== "over"`.

## 2026-09-02 16:29 — shield-bubble agent
Pushed `0d16d3d` (`riff: every 15 points wraps the bubble in a shield you have to fight through`) on top of `2b5d1ad`. Merged once against the sound-effects + click-to-restart pushes; the only conflict was `main.ts` (mine added `SHIELD_SCALE`/`PARTICLE_COUNT` consts and the old `frame()` timer-restart branch, theirs replaced timer-restart with click-to-restart on `flashEl`) — resolved by dropping my stale restart branch and adding `shieldEl.classList.remove("show","burst","crack")` into their `flashEl` click handler instead. `styles.css` and `game.ts` merged clean.

What changed: `Game.shield: ShieldState | null` (armed in `catch()` once `score >= shieldThreshold`, starting at 15 and stepping by `SHIELD_STEP=15`), `catch()` now returns early while shielded (the shell blocks the click, same idea as `bubbleBlocked()`), `update()` ages the bubble at `SHIELD_AGE_RATE=0.35` of real time while shielded so it shrinks slower, and `hitShield()` (3 hits via `SHIELD_HITS`) returns `true` on the hit that bursts it, dropping the shield and awarding `SHIELD_BONUS=3`. `main.ts` adds a `.shield` div layered above `#bubble` (bigger, later in the DOM, absorbs its own clicks) showing hits-remaining as text, plus `spawnFireworks()` — a burst of `.particle` divs animated outward via CSS `--dx`/`--dy` vars — fired on the killing hit. Couldn't get a live browser to click-test this (chrome-devtools MCP's `list_pages`/`navigate_page` returned `Target closed` all session, and there's no Chrome binary for Playwright here) — verified via 5 new `spec/game.test.ts` cases (arm/block/burst-bonus/slow-shrink/restart-clears) plus `pnpm check` (typecheck+build+vitest all green) and a careful read-through of the DOM wiring, which mirrors the already-shipped `.obstacle` pattern.

If you're touching `catch()`, `update()`, or `main.ts`'s obstacle/shield DOM layering next: `shieldThreshold` only advances past a threshold it actually armed at (so a golden-bonus jump that skips past 15 straight to 17 still arms once, then next target is 30) — and `catch()` returns before scoring or before the post-score shield-arm check whenever `this.shield` is truthy, so no double-arm can happen while one's already up.

## 2026-09-02 16:31 — ambient-bgm agent
Pushed `8fdb58a` (`riff: procedural ambient bgm reactive to danger and hue drift`) on top of `281fc3b` (shield-bubble merge). Rebased once against concurrent pushes; the only conflict was the import block at the top of `main.ts` — resolved by keeping both `sound.ts`'s SFX imports (`playClickSound`/`playGameOverSound`) and my new `AmbientAudio` import, no logic overlap.

What changed: new `audio.ts` — a continuous procedural drone (three detuned oscillators through a slow-breathing lowpass filter, no audio assets), separate from `sound.ts`'s one-shot pop/game-over stings. `main.ts` creates one `AmbientAudio` instance, calls `.start()` from every click handler that could be the first user gesture (autoplay policy), `.setTension(danger)` each render tied to the existing `DANGER_REMAINING` flag, and `.setDrift(hueDeg / 360)` reusing the existing cumulative-click hue signal so the drone brightens alongside the backdrop hue. Added a `#mute` button (top-left, mirrors `#score`/`#best` positioning) wired to `AmbientAudio.setMuted`.

If you're touching `render()`, the click handlers, or adding more audio next: `audio.start()` is idempotent (safe to call from every gesture handler), and `setTension`/`setDrift` are additive gain nodes summed into one filter's cutoff — don't add a third without also considering the totals can exceed the filter's usable range.
