import { describe, expect, it } from "vitest";
import { Game } from "../game.ts";

// This riff moves past the original brief: clicking no longer instantly
// "catches" the bubble — it feeds it, resetting the clock but inflating it.
// Two ways to lose now share one button: leave it unclicked and it vanishes;
// click it too many times and it bursts.
describe("game: a missed bubble ends the round", () => {
  it("stays playing right up to the bubble's lifetime, then ends", () => {
    const game = new Game(() => 0.5);
    const lifetime = game.bubble.lifetime;

    game.update(lifetime - 1);
    expect(game.status).toBe("playing");

    game.update(2);
    expect(game.status).toBe("over");
  });

  it("records the round's score as the best once the round ends", () => {
    const game = new Game(() => 0.5);
    game.update(100);
    game.catch();
    game.update(game.bubble.lifetime + 1);

    expect(game.status).toBe("over");
    expect(game.best).toBe(1);
  });

  it("catching the bubble before it expires scores a point and continues", () => {
    const game = new Game(() => 0.5);
    game.update(100);
    game.catch();

    expect(game.status).toBe("playing");
    expect(game.score).toBe(1);
  });

  it("a finished round can restart from zero", () => {
    const game = new Game(() => 0.5);
    game.update(game.bubble.lifetime + 1);
    expect(game.status).toBe("over");

    game.restart();
    expect(game.status).toBe("playing");
    expect(game.score).toBe(0);
  });

  it("catching a golden bubble scores a 3-point bonus instead of 1", () => {
    // Scripted random sequence: angle, then a centred spawn (away from any
    // obstacle, which spawns near the MARGIN corner), then a golden roll
    // that lands under the golden chance, then obstacle timers rolled high
    // enough to stay hidden for the single short tick this test runs.
    const rolls = [0.3, 0.5, 0.5, 0.1, 0.9, 0.9, 0.9];
    let i = 0;
    const game = new Game(() => rolls[Math.min(i++, rolls.length - 1)]);
    expect(game.bubble.golden).toBe(true);

    game.update(100);
    game.catch();

    expect(game.score).toBe(3);
  });
});

describe("game: clicking inflates the bubble instead of catching it", () => {
  it("a single click grows the bubble a little and keeps play going", () => {
    const game = new Game(() => 0.5);
    const before = game.bubble.growth;
    game.catch();

    expect(game.status).toBe("playing");
    expect(game.bubble.growth).toBeGreaterThan(before);
  });

  it("clicking enough times doubles the bubble and bursts it, ending the round", () => {
    const game = new Game(() => 0.5);
    for (let i = 0; i < 30 && game.status === "playing"; i++) {
      game.catch();
    }

    expect(game.status).toBe("over");
    expect(game.endReason).toBe("burst");
    expect(game.best).toBe(game.score);
  });

  it("a restarted round starts fresh, unswollen", () => {
    const game = new Game(() => 0.5);
    for (let i = 0; i < 30 && game.status === "playing"; i++) {
      game.catch();
    }
    expect(game.endReason).toBe("burst");

    game.restart();
    expect(game.bubble.growth).toBe(1);
  });
});

// Every catch here is golden (0.1 sits under GOLDEN_CHANCE), so score climbs
// by 3 per click instead of 1 — reaching the 15-point shield threshold in 5
// clicks, well before the ~13 clicks of growth it'd take to burst under the
// normal 1-point path.
const armShield = (game: Game): void => {
  for (let i = 0; i < 15 && game.status === "playing" && !game.shield; i++) {
    game.catch();
  }
};

describe("game: every 15 points, a shield wraps the bubble", () => {
  it("arms a shield the moment score reaches the next multiple of 15", () => {
    const game = new Game(() => 0.1);
    expect(game.shield).toBeNull();

    armShield(game);

    expect(game.shield).not.toBeNull();
    expect(game.score).toBeGreaterThanOrEqual(15);
  });

  it("blocks catch() on the wrapped bubble until the shield is down", () => {
    const game = new Game(() => 0.1);
    armShield(game);
    const scoreWhileShielded = game.score;

    game.catch();
    expect(game.score).toBe(scoreWhileShielded);
  });

  it("takes several hits to burst, then awards a bonus and drops the shield", () => {
    const game = new Game(() => 0.1);
    armShield(game);
    const scoreAtShield = game.score;
    const hits = game.shield!.hits;

    for (let i = 0; i < hits - 1; i++) {
      expect(game.hitShield()).toBe(false);
    }
    expect(game.shield).not.toBeNull();

    expect(game.hitShield()).toBe(true);
    expect(game.shield).toBeNull();
    expect(game.score).toBe(scoreAtShield + 3);
  });

  it("shrinks the shielded bubble slower than an unshielded one", () => {
    const game = new Game(() => 0.1);
    armShield(game);
    expect(game.shield).not.toBeNull();

    const lifetime = game.bubble.lifetime;
    game.update(lifetime * 0.9);
    expect(game.status).toBe("playing");
  });

  it("a restarted round clears the shield", () => {
    const game = new Game(() => 0.1);
    armShield(game);
    expect(game.shield).not.toBeNull();

    game.restart();
    expect(game.shield).toBeNull();
  });
});
