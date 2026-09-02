// Pure game logic, no DOM: a single bubble drifts inside the unit square and
// shrinks toward a fixed lifetime — leave it unclicked and it vanishes, ending
// the round. Clicking it doesn't catch it: it feeds it, resetting the clock
// but permanently inflating it. Inflate it past double its birth size and it
// bursts, ending the round the other way. Survival and greed pull against
// each other on the same button.
export type GameStatus = "playing" | "over";
export type EndReason = "missed" | "burst" | "obstacle" | null;

export interface BubbleState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  lifetime: number;
  // Set for the single update() tick in which the bubble bounced off a
  // wall, so the renderer can react (wobble) without the physics needing
  // to know anything about presentation.
  bounced: boolean;
  growth: number;
  // Rare bonus bubble worth GOLDEN_BONUS points instead of 1.
  golden: boolean;
}

const MARGIN = 0.08;
const MIN_LIFETIME = 650;
const BASE_LIFETIME = 2200;
const LIFETIME_STEP = 90;
const BASE_SPEED = 0.06;
const SPEED_STEP = 0.006;
const GROWTH_STEP = 0.08;
const BURST_GROWTH = 2;

const GOLDEN_CHANCE = 0.15;
const GOLDEN_BONUS = 3;

const OBSTACLE_COUNT = 2;
const OBSTACLE_RADIUS = 0.07;
const OBSTACLE_MIN_HIDDEN = 2400;
const OBSTACLE_MAX_HIDDEN = 5000;
const OBSTACLE_MIN_VISIBLE = 700;
const OBSTACLE_MAX_VISIBLE = 1400;
// Only used for obstacle-collision math (the wall margin already stands in
// for the bubble's own size there); the bubble's rendered radius varies with
// its remaining lifetime, but physics needs one fixed number to bounce off.
const BUBBLE_RADIUS = 0.035;

export interface ObstacleState {
  x: number;
  y: number;
  radius: number;
  visible: boolean;
  timer: number;
}

export class Game {
  score = 0;
  best = 0;
  status: GameStatus = "playing";
  endReason: EndReason = null;
  bubble: BubbleState;
  obstacles: ObstacleState[];

  constructor(private readonly random: () => number = Math.random) {
    this.bubble = this.spawn();
    // Staggered initial timers so obstacles don't all blink in sync.
    this.obstacles = Array.from({ length: OBSTACLE_COUNT }, () => ({
      x: 0,
      y: 0,
      radius: OBSTACLE_RADIUS,
      visible: false,
      timer: this.random() * OBSTACLE_MAX_HIDDEN,
    }));
  }

  // A fed bubble keeps its position, not a fresh random one: on a wide stage
  // a random respawn can land far from the cursor while the shrinking
  // lifetime leaves no time to travel there, turning a high score into a
  // spawn-luck check rather than a tracking one.
  private spawn(origin?: { x: number; y: number }): BubbleState {
    const angle = this.random() * Math.PI * 2;
    const speed = BASE_SPEED + this.score * SPEED_STEP;
    return {
      x: origin ? origin.x : MARGIN + this.random() * (1 - 2 * MARGIN),
      y: origin ? origin.y : MARGIN + this.random() * (1 - 2 * MARGIN),
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      age: 0,
      lifetime: Math.max(MIN_LIFETIME, BASE_LIFETIME - this.score * LIFETIME_STEP),
      bounced: false,
      growth: origin ? this.bubble.growth : 1,
      golden: this.random() < GOLDEN_CHANCE,
    };
  }

  update(dtMs: number): void {
    if (this.status !== "playing") return;
    const b = this.bubble;
    b.bounced = false;
    b.age += dtMs;
    b.x += b.vx * (dtMs / 1000);
    b.y += b.vy * (dtMs / 1000);
    if (b.x < MARGIN || b.x > 1 - MARGIN) {
      b.vx *= -1;
      b.x = Math.min(1 - MARGIN, Math.max(MARGIN, b.x));
      b.bounced = true;
    }
    if (b.y < MARGIN || b.y > 1 - MARGIN) {
      b.vy *= -1;
      b.y = Math.min(1 - MARGIN, Math.max(MARGIN, b.y));
      b.bounced = true;
    }
    if (b.age >= b.lifetime) {
      this.status = "over";
      this.endReason = "missed";
      this.best = Math.max(this.best, this.score);
    }
    for (const o of this.obstacles) this.updateObstacle(o, dtMs);
    this.applyObstacleCollisions();
  }

  // A visible obstacle is a solid body, not just a click-blocker: the bubble
  // bounces off it the same way it bounces off the stage walls, reflecting
  // its velocity about the collision normal and getting pushed back outside
  // the obstacle's radius so the two don't stay locked in overlap.
  private applyObstacleCollisions(): void {
    const b = this.bubble;
    for (const o of this.obstacles) {
      if (!o.visible) continue;
      const dx = b.x - o.x;
      const dy = b.y - o.y;
      const dist = Math.hypot(dx, dy);
      const minDist = o.radius + BUBBLE_RADIUS;
      if (dist >= minDist) continue;
      const nx = dist > 0 ? dx / dist : 1;
      const ny = dist > 0 ? dy / dist : 0;
      const dot = b.vx * nx + b.vy * ny;
      if (dot < 0) {
        b.vx -= 2 * dot * nx;
        b.vy -= 2 * dot * ny;
      }
      b.x = o.x + nx * minDist;
      b.y = o.y + ny * minDist;
      b.bounced = true;
    }
  }

  private updateObstacle(o: ObstacleState, dtMs: number): void {
    o.timer -= dtMs;
    // A long frame stall (tab backgrounded, slow device) can owe more than
    // one toggle's worth of time; settle it in a loop rather than letting an
    // obstacle stay stuck showing/hidden far past its schedule.
    while (o.timer <= 0) {
      o.visible = !o.visible;
      if (o.visible) {
        o.x = OBSTACLE_RADIUS + this.random() * (1 - 2 * OBSTACLE_RADIUS);
        o.y = OBSTACLE_RADIUS + this.random() * (1 - 2 * OBSTACLE_RADIUS);
        o.timer += OBSTACLE_MIN_VISIBLE + this.random() * (OBSTACLE_MAX_VISIBLE - OBSTACLE_MIN_VISIBLE);
      } else {
        o.timer += OBSTACLE_MIN_HIDDEN + this.random() * (OBSTACLE_MAX_HIDDEN - OBSTACLE_MIN_HIDDEN);
      }
    }
  }

  // A visible obstacle sitting on the bubble physically covers it on
  // screen, so a keyboard-activated catch (Space/Enter on the focused
  // button) must be refused the same way a mouse click is: the obstacle is
  // in the way, not the bubble.
  private bubbleBlocked(): boolean {
    return this.obstacles.some((o) => {
      if (!o.visible) return false;
      const dx = o.x - this.bubble.x;
      const dy = o.y - this.bubble.y;
      return Math.hypot(dx, dy) < o.radius;
    });
  }

  catch(): void {
    if (this.status !== "playing") return;
    if (this.bubbleBlocked()) return;
    this.score += this.bubble.golden ? GOLDEN_BONUS : 1;
    this.bubble.growth += GROWTH_STEP;
    if (this.bubble.growth >= BURST_GROWTH) {
      this.status = "over";
      this.endReason = "burst";
      this.best = Math.max(this.best, this.score);
      return;
    }
    this.bubble = this.spawn({ x: this.bubble.x, y: this.bubble.y });
  }

  // Touching an obstacle by clicking it (rather than the bubble drifting
  // into it) is a fatal mistake, not a bump: it ends the round on the spot,
  // same as running out the clock on a missed bubble.
  hitObstacle(): void {
    if (this.status !== "playing") return;
    this.status = "over";
    this.endReason = "obstacle";
    this.best = Math.max(this.best, this.score);
  }

  restart(): void {
    this.score = 0;
    this.status = "playing";
    this.endReason = null;
    this.bubble = this.spawn();
  }
}
