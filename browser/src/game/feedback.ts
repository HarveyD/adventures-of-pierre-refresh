export type FeedbackCue = 'landing' | 'stomp' | 'checkpoint' | 'boss-hit' | 'boss-defeated';
export interface FeedbackEffect {
  cue: FeedbackCue; x: number; y: number; age: number; duration: number; strength: number;
}

export class FeedbackEffects {
  readonly active: FeedbackEffect[] = [];
  add(cue: FeedbackCue, x: number, y: number, strength = 1): void {
    if (!Number.isFinite(x) || !Number.isFinite(y)) return;
    this.active.push({ cue, x, y, age: 0, duration: cue === 'checkpoint' ? 1000 : cue === 'boss-defeated' ? 800 : 360, strength });
    if (this.active.length > 16) this.active.shift();
  }
  advance(delta: number): void {
    if (!Number.isFinite(delta) || delta <= 0) return;
    for (const effect of this.active) effect.age += Math.min(delta, 100);
    for (let index = this.active.length - 1; index >= 0; index--)
      if (this.active[index].age >= this.active[index].duration) this.active.splice(index, 1);
  }
  clear(): void { this.active.length = 0; }
}

const notes: Record<FeedbackCue, readonly number[]> = {
  landing: [95], stomp: [230, 140], checkpoint: [523.25, 659.25, 783.99],
  'boss-hit': [330, 220], 'boss-defeated': [523.25, 659.25, 783.99, 1046.5],
};

// Synthesized cues need no extra downloads. Open the context only from a user gesture.
export class FeedbackAudio {
  private context: AudioContext | null = null;
  private voices = new Map<OscillatorNode, () => void>();
  private muted = false;
  private volume = 0.35;
  private active = false;
  private destroyed = false;
  constructor(private readonly createContext: () => AudioContext = () => new AudioContext()) {}
  get status() { return { context: this.context?.state ?? 'unopened', voices: this.voices.size, active: this.active, muted: this.muted, volume: this.volume }; }
  configure(muted: boolean, volume: number): void {
    this.muted = muted; this.volume = Math.max(0, Math.min(1, volume));
    this.stopVoices();
  }
  unlock(): void {
    if (this.destroyed || this.muted || this.volume === 0) return;
    try {
      this.context ??= this.createContext();
      if (this.context.state === 'suspended') void this.context.resume().catch(() => {});
    } catch { /* Unsupported or blocked audio must never interrupt gameplay. */ }
  }
  setActive(active: boolean): void {
    this.active = active;
    if (!active) this.stopVoices();
  }
  play(cue: FeedbackCue): void {
    const context = this.context;
    if (this.destroyed || !this.active || this.muted || this.volume === 0 || context?.state !== 'running') return;
    if (this.voices.size + notes[cue].length > 12) this.stopVoices();
    try {
      notes[cue].forEach((frequency, index) => {
        const oscillator = context.createOscillator(), gain = context.createGain();
        const start = context.currentTime + index * 0.085;
        const duration = cue === 'landing' ? 0.065 : 0.14;
        oscillator.type = cue === 'landing' ? 'sine' : 'triangle';
        oscillator.frequency.setValueAtTime(frequency, start);
        oscillator.frequency.exponentialRampToValueAtTime(frequency * (cue === 'landing' ? 0.5 : 0.96), start + duration);
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(this.volume * (cue === 'landing' ? 0.16 : 0.22), start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
        oscillator.connect(gain); gain.connect(context.destination);
        const release = () => { oscillator.disconnect(); gain.disconnect(); this.voices.delete(oscillator); };
        this.voices.set(oscillator, release);
        oscillator.onended = release;
        oscillator.start(start); oscillator.stop(start + duration + 0.01);
      });
    } catch { this.stopVoices(); }
  }
  private stopVoices(): void {
    for (const [voice, release] of this.voices) {
      try { voice.stop(); } catch { /* Already ended. */ }
      release();
    }
    this.voices.clear();
  }
  destroy(): void {
    this.destroyed = true; this.setActive(false);
    if (this.context) void this.context.close().catch(() => {});
    this.context = null;
  }
}
