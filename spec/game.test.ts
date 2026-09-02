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
