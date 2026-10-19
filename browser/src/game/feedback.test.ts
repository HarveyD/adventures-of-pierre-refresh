import { describe, expect, it, vi } from 'vitest';
import { FeedbackAudio, FeedbackEffects } from './feedback';

const fakeAudio = (state = 'running') => {
  const voices: { stop: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn>; onended?: (event: Event) => void }[] = [];
  const parameter = () => ({ setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() });
  const context = {
    state, currentTime: 5, destination: {}, resume: vi.fn().mockResolvedValue(undefined), close: vi.fn().mockResolvedValue(undefined),
    createGain: vi.fn(() => ({ gain: parameter(), connect: vi.fn(), disconnect: vi.fn() })),
    createOscillator: vi.fn(() => {
      const voice = { type: '', frequency: parameter(), connect: vi.fn(), disconnect: vi.fn(), start: vi.fn(), stop: vi.fn(), onended: undefined };
      voices.push(voice); return voice;
    }),
  };
  const factory = vi.fn(() => context as unknown as AudioContext);
  return { context, voices, factory, audio: new FeedbackAudio(factory) };
};

describe('Refresh feedback audio', () => {
  it('creates no context before a gesture and never queues blocked cues', () => {
    const { audio, factory, context } = fakeAudio('suspended');
    audio.configure(false, 0.35); audio.setActive(true); audio.play('checkpoint');
    expect(factory).not.toHaveBeenCalled();
    audio.unlock(); expect(factory).toHaveBeenCalledTimes(1); expect(context.resume).toHaveBeenCalledTimes(1);
    audio.play('checkpoint'); expect(context.createOscillator).not.toHaveBeenCalled();
  });
  it('plays a short three-note checkpoint cue and releases its audio graph', () => {
    const { audio, voices, context } = fakeAudio();
    audio.unlock(); audio.setActive(true); audio.play('checkpoint');
    expect(voices).toHaveLength(3);
    expect(audio.status.voices).toBe(3);
    for (const voice of voices) voice.onended?.(new Event('ended'));
    expect(audio.status.voices).toBe(0);
    expect(context.createGain.mock.results.every(result => result.value.disconnect.mock.calls.length === 1)).toBe(true);
  });
  it('stops scheduled notes on mute, pause, volume changes and destruction', () => {
    const { audio, voices, context } = fakeAudio();
    audio.unlock(); audio.setActive(true); audio.play('checkpoint'); audio.configure(true, 0.35);
    expect(audio.status.voices).toBe(0); expect(voices.every(voice => voice.stop.mock.calls.length === 2)).toBe(true);
    audio.play('stomp'); expect(voices).toHaveLength(3);
    audio.configure(false, 0.35); audio.play('stomp'); expect(audio.status.voices).toBe(2);
    audio.setActive(false); expect(audio.status.voices).toBe(0);
    audio.play('checkpoint'); expect(voices).toHaveLength(5);
    audio.setActive(true); audio.play('landing'); audio.configure(false, 0);
    audio.play('landing'); expect(audio.status.voices).toBe(0);
    audio.destroy(); audio.unlock(); expect(context.close).toHaveBeenCalledTimes(1);
  });
  it('bounds overlapping cues and handles unavailable audio gracefully', () => {
    const { audio } = fakeAudio(); audio.unlock(); audio.setActive(true);
    for (let index = 0; index < 100; index++) audio.play('boss-defeated');
    expect(audio.status.voices).toBeLessThanOrEqual(12);
    const unavailable = new FeedbackAudio(() => { throw new Error('Audio unavailable'); });
    expect(() => { unavailable.unlock(); unavailable.setActive(true); unavailable.play('checkpoint'); unavailable.destroy(); }).not.toThrow();
  });
  it('does not create an audio context while muted or at zero volume', () => {
    const { audio, factory } = fakeAudio();
    audio.configure(true, 0.35); audio.unlock(); audio.configure(false, 0); audio.unlock();
    expect(factory).not.toHaveBeenCalled();
  });
});

describe('bounded impact effects', () => {
  it('expires effects and clears them without creating scene objects', () => {
    const effects = new FeedbackEffects();
    effects.add('landing', 20, 30); effects.add('checkpoint', 50, 60);
    for (let tick = 0; tick < 4; tick++) effects.advance(100);
    expect(effects.active.map(effect => effect.cue)).toEqual(['checkpoint']);
    for (let tick = 0; tick < 6; tick++) effects.advance(100);
    expect(effects.active).toHaveLength(0);
    effects.add('stomp', 10, 20); effects.clear(); expect(effects.active).toHaveLength(0);
  });
  it('bounds bursts, rejects invalid positions and ignores invalid time', () => {
    const effects = new FeedbackEffects();
    effects.add('landing', NaN, 10); expect(effects.active).toHaveLength(0);
    for (let count = 0; count < 100; count++) effects.add('stomp', count, 20);
    expect(effects.active).toHaveLength(16); expect(effects.active[0].x).toBe(84);
    effects.advance(NaN); effects.advance(-1); expect(effects.active[0].age).toBe(0);
  });
});
