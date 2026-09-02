import { Game } from "./game.ts";

const stage = document.querySelector<HTMLDivElement>("#stage")!;
const bubbleEl = document.querySelector<HTMLButtonElement>("#bubble")!;
const scoreEl = document.querySelector<HTMLDivElement>("#score")!;
const bestEl = document.querySelector<HTMLDivElement>("#best")!;
const flashEl = document.querySelector<HTMLDivElement>("#flash")!;

const MIN_SIZE = 22;
const MAX_SIZE = 72;
const RESTART_DELAY = 1100;

const game = new Game();
let lastTime: number | null = null;
let restartAt: number | null = null;
let stageWidth = 0;
let stageHeight = 0;

// One div per obstacle, created once and reused — they sit later in the DOM
// than #bubble so a visible one physically overlaps and intercepts clicks
// meant for the bubble beneath it, the same way a real object in the way would.
const obstacleEls = game.obstacles.map(() => {
  const el = document.createElement("div");
  el.className = "obstacle";
  el.setAttribute("aria-hidden", "true");
  stage.appendChild(el);
  return el;
});

function measure(): void {
  const rect = stage.getBoundingClientRect();
  stageWidth = rect.width;
  stageHeight = rect.height;
}

function sizeFor(age: number, lifetime: number, growth: number): number {
  const remaining = Math.max(0, 1 - age / lifetime);
  return (MIN_SIZE + (MAX_SIZE - MIN_SIZE) * remaining) * growth;
}

function render(): void {
  const { bubble } = game;
  const size = sizeFor(bubble.age, bubble.lifetime, bubble.growth);
  bubbleEl.style.width = `${size}px`;
  bubbleEl.style.height = `${size}px`;
  bubbleEl.style.left = `${bubble.x * stageWidth - size / 2}px`;
  bubbleEl.style.top = `${bubble.y * stageHeight - size / 2}px`;
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

function frame(now: number): void {
  if (lastTime === null) lastTime = now;
  const dt = now - lastTime;
  lastTime = now;

  const wasPlaying = game.status === "playing";
  if (wasPlaying) {
    game.update(dt);
  }
  const justEnded: boolean = wasPlaying && game.status === "over";
  if (justEnded) {
    const burst = game.endReason === "burst";
    flashEl.textContent = burst ? `${game.score} — burst!` : String(game.score);
    flashEl.classList.add("show");
    bubbleEl.classList.add(burst ? "burst" : "popped");
    restartAt = now + RESTART_DELAY;
  } else if (!wasPlaying && restartAt !== null && now >= restartAt) {
    flashEl.classList.remove("show");
    bubbleEl.classList.remove("popped", "burst");
    game.restart();
    restartAt = null;
  }

  render();
  requestAnimationFrame(frame);
}

bubbleEl.addEventListener("click", () => {
  if (game.status !== "playing") return;
  game.catch();
  render();
});

window.addEventListener("resize", measure);
measure();
render();
requestAnimationFrame(frame);
