// Tiny synth, no audio assets: a couple of oscillators shaped with gain
// envelopes stand in for a "pop" and a "game over" sting. Lazily created on
// first use so the AudioContext starts inside the click gesture that
// triggers it, satisfying autoplay policies without an explicit unlock step.
let ctx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

const CLICK_SIZE_MIN = 20;
const CLICK_SIZE_MAX = 150;
const CLICK_FREQ_MAX = 900;
const CLICK_FREQ_MIN = 320;

// A soap bubble's pop pitches down as it grows: a small bubble pings high,
// a stretched one thuds lower. Map size to frequency inversely, clamped so
// wildly grown or shrunk bubbles don't produce an inaudible or shrieking tone.
export function playClickSound(bubbleSize: number): void {
  const t = Math.min(1, Math.max(0, (bubbleSize - CLICK_SIZE_MIN) / (CLICK_SIZE_MAX - CLICK_SIZE_MIN)));
  const baseFreq = CLICK_FREQ_MAX + (CLICK_FREQ_MIN - CLICK_FREQ_MAX) * t;

  const audio = getContext();
  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(baseFreq * 1.6, now);
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.85, now + 0.09);
  gain.gain.setValueAtTime(0.18, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
  osc.connect(gain).connect(audio.destination);
  osc.start(now);
  osc.stop(now + 0.13);
}

// A short descending sawtooth sweep reads as "that's over" regardless of how
// the round ended (missed, burst, or obstacle) — one sound, not a variant per
// death, since the visual flash already distinguishes the reason.
export function playGameOverSound(): void {
  const audio = getContext();
  const now = audio.currentTime;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(320, now);
  osc.frequency.exponentialRampToValueAtTime(70, now + 0.4);
  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
  osc.connect(gain).connect(audio.destination);
  osc.start(now);
  osc.stop(now + 0.46);
}
