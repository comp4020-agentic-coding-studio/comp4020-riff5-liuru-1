// A generated drone, not a sample: three detuned oscillators through a
// slowly breathing lowpass filter, so the soundscape is produced the same
// way everything else on screen is (hue drift, golden roll) rather than
// played back from a file. Browsers refuse audio before a user gesture, so
// the context is built lazily and start() is meant to be called from a
// click handler that already exists for other reasons.
export class AmbientAudio {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private tensionGain: GainNode | null = null;
  private driftGain: GainNode | null = null;
  private started = false;
  private muted = false;
  private readonly baseVolume = 0.055;

  private ensure(): AudioContext {
    if (this.ctx) return this.ctx;
    const ctx = new AudioContext();

    const master = ctx.createGain();
    master.gain.value = 0;
    master.connect(ctx.destination);

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = 380;
    filter.Q.value = 0.6;
    filter.connect(master);

    // Slow LFO breathing the filter open and shut so the drone never sits
    // static, at roughly the same unhurried pace as the bubble's hue sweep.
    const breathe = ctx.createOscillator();
    breathe.frequency.value = 0.035;
    const breatheGain = ctx.createGain();
    breatheGain.gain.value = 140;
    breathe.connect(breatheGain);
    breatheGain.connect(filter.frequency);
    breathe.start();

    // Two additive nudges to the same cutoff, driven from outside by game
    // state rather than audio-rate signals: tension rises while the bubble
    // is about to die, drift rises with the same cumulative-click hue drift
    // the backdrop already uses, so a long session brightens both together.
    const tensionGain = ctx.createGain();
    tensionGain.gain.value = 0;
    tensionGain.connect(filter.frequency);

    const driftGain = ctx.createGain();
    driftGain.gain.value = 0;
    driftGain.connect(filter.frequency);

    [110, 164.81, 220].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.detune.value = (i - 1) * 5;
      osc.connect(filter);
      osc.start();

      // Each voice wanders slightly out of tune on its own slow cycle so the
      // stack of sines beats gently against itself instead of sitting dead flat.
      const wander = ctx.createOscillator();
      wander.frequency.value = 0.04 + i * 0.017;
      const wanderGain = ctx.createGain();
      wanderGain.gain.value = 3;
      wander.connect(wanderGain);
      wanderGain.connect(osc.detune);
      wander.start();
    });

    this.ctx = ctx;
    this.master = master;
    this.tensionGain = tensionGain;
    this.driftGain = driftGain;
    return ctx;
  }

  // Idempotent: call it from every click handler that might be the first
  // interaction on the page.
  start(): void {
    const ctx = this.ensure();
    if (ctx.state === "suspended") void ctx.resume();
    if (this.started) return;
    this.started = true;
    this.master!.gain.setTargetAtTime(this.muted ? 0 : this.baseVolume, ctx.currentTime, 1.4);
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (!this.ctx || !this.master || !this.started) return;
    this.master.gain.setTargetAtTime(muted ? 0 : this.baseVolume, this.ctx.currentTime, 0.3);
  }

  isMuted(): boolean {
    return this.muted;
  }

  // danger: whether the current bubble is about to expire.
  setTension(danger: boolean): void {
    if (!this.ctx || !this.tensionGain) return;
    this.tensionGain.gain.setTargetAtTime(danger ? 220 : 0, this.ctx.currentTime, 0.5);
  }

  // progress: 0..1, same cumulative-click signal that drives --bg-hue.
  setDrift(progress: number): void {
    if (!this.ctx || !this.driftGain) return;
    this.driftGain.gain.setTargetAtTime(progress * 260, this.ctx.currentTime, 2);
  }
}
