import { Game } from "./game.ts";

const stage = document.querySelector<HTMLDivElement>("#stage")!;
const bubbleEl = document.querySelector<HTMLButtonElement>("#bubble")!;
const scoreEl = document.querySelector<HTMLDivElement>("#score")!;
const bestEl = document.querySelector<HTMLDivElement>("#best")!;
const flashEl = document.querySelector<HTMLButtonElement>("#flash")!;

const MIN_SIZE = 22;
const MAX_SIZE = 72;

const game = new Game();
let lastTime: number | null = null;
let stageWidth = 0;
let stageHeight = 0;

// One div per obstacle, created once and reused — they sit later in the DOM
// than #bubble so a visible one physically overlaps and intercepts clicks
// meant for the bubble beneath it, the same way a real object in the way would.
const obstacleEls = game.obstacles.map(() => {
  const el = document.createElement("div");
  el.className = "obstacle";
  el.setAttribute("aria-hidden", "true");
  // Clicking the obstacle itself (not the bubble drifting into it) is a
  // fatal miss-click: end the round immediately, same as running out the
  // clock, rather than just bouncing.
  el.addEventListener("click", () => {
    if (game.status !== "playing") return;
    game.hitObstacle();
    el.classList.add("hit");
    endRound();
    render();
  });
  stage.appendChild(el);
  return el;
});

function measure(): void {
  const rect = stage.getBoundingClientRect();
  stageWidth = rect.width;
  stageHeight = rect.height;
}

// A soap bubble's colour comes from thin-film interference, not pigment: the
// film's colour shifts across the spectrum as it stretches or thins. A newly
// spawned (thick, near-max-size) bubble sits at one end of that hue sweep; as
// it shrinks toward death it sweeps across the rest, landing near red just
// before it's gone — which doubles as the "about to burst" warning.
const DANGER_REMAINING = 0.2;

function sizeFor(age: number, lifetime: number, growth: number): number {
  const remaining = Math.max(0, 1 - age / lifetime);
  return (MIN_SIZE + (MAX_SIZE - MIN_SIZE) * remaining) * growth;
}

function wobble(): void {
  bubbleEl.classList.remove("wobble");
  // Force a reflow so the animation restarts even if it's still running
  // from a bounce a moment ago.
  void bubbleEl.offsetWidth;
  bubbleEl.classList.add("wobble");
}

function render(): void {
  const { bubble } = game;
  const remaining = Math.max(0, 1 - bubble.age / bubble.lifetime);
  const size = sizeFor(bubble.age, bubble.lifetime, bubble.growth);
  bubbleEl.style.width = `${size}px`;
  bubbleEl.style.height = `${size}px`;
  bubbleEl.style.left = `${bubble.x * stageWidth - size / 2}px`;
  bubbleEl.style.top = `${bubble.y * stageHeight - size / 2}px`;
  bubbleEl.style.setProperty("--hue", `${(1 - remaining) * 300}`);
  bubbleEl.classList.toggle("danger", remaining < DANGER_REMAINING);
  bubbleEl.classList.toggle("golden", bubble.golden);
  scoreEl.textContent = String(game.score);
  bestEl.textContent = game.best > 0 ? `best ${game.best}` : "";

  game.obstacles.forEach((o, i) => {
    const el = obstacleEls[i];
    el.classList.toggle("show", o.visible);
    const obstacleSize = o.radius * 2 * stageWidth;
    el.style.width = `${obstacleSize}px`;
    el.style.height = `${o.radius * 2 * stageHeight}px`;
    el.style.left = `${o.x * stageWidth - obstacleSize / 2}px`;
    el.style.top = `${o.y * stageHeight - (o.radius * 2 * stageHeight) / 2}px`;
  });
}

// Pause on death: show what this round scored next to the best ever scored,
// and wait for a click rather than restarting on a timer — a death worth
// reading beats a death worth waiting out.
function endRound(): void {
  const reason = game.endReason;
  const label =
    reason === "burst" ? `${game.score} — burst!` : reason === "obstacle" ? `${game.score} — hit!` : String(game.score);
  flashEl.innerHTML = `
    <div class="flash-score">${label}</div>
    <div class="flash-best">best ${game.best}</div>
    <div class="flash-hint">click to play again</div>
  `;
  flashEl.disabled = false;
  flashEl.classList.add("show");
  bubbleEl.classList.add(reason === "burst" ? "burst" : "popped");
}

function frame(now: number): void {
  if (lastTime === null) lastTime = now;
  const dt = now - lastTime;
  lastTime = now;

  const wasPlaying = game.status === "playing";
  if (wasPlaying) {
    game.update(dt);
    if (game.bubble.bounced) wobble();
  }
  const justEnded: boolean = wasPlaying && game.status === "over";
  if (justEnded) endRound();

  render();
  requestAnimationFrame(frame);
}

// Every click on the bubble nudges the backdrop's hue a little further round
// the wheel — a slow, cumulative drift across the whole session rather than
// per-round feedback, so it survives restarts and rewards sustained play.
const HUE_STEP_DEG = 7;
let totalClicks = 0;

bubbleEl.addEventListener("click", () => {
  if (game.status !== "playing") return;
  wobble();
  totalClicks += 1;
  document.documentElement.style.setProperty("--bg-hue", `${(totalClicks * HUE_STEP_DEG) % 360}deg`);
  game.catch();
  render();
});

flashEl.addEventListener("click", () => {
  if (game.status !== "over") return;
  flashEl.classList.remove("show");
  flashEl.disabled = true;
  bubbleEl.classList.remove("popped", "burst");
  obstacleEls.forEach((el) => el.classList.remove("hit"));
  game.restart();
  render();
});

window.addEventListener("resize", measure);
measure();
render();
requestAnimationFrame(frame);
