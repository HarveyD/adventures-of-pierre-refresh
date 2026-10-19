import { describe, it, expect, vi } from 'vitest';
import { HeldInputs, actionForKey } from './input';
describe('held inputs', () => {
  it('keeps movement held until every physical source is released', () => {
    const emit = vi.fn(); const inputs = new HeldInputs(emit);
    inputs.set('KeyA', 'left', true); inputs.set('ArrowLeft', 'left', true);
    inputs.release('KeyA'); expect(emit.mock.calls).toEqual([['left', true]]);
    inputs.release('ArrowLeft'); expect(emit.mock.calls).toEqual([['left', true], ['left', false]]);
  });
  it('clears keyboard and simultaneous touch inputs together', () => {
    const emit = vi.fn(); const inputs = new HeldInputs(emit);
    inputs.set('pointer:1', 'left', true); inputs.set('pointer:2', 'jump', true); inputs.clear();
    expect(emit.mock.calls).toEqual([['left', true], ['jump', true], ['left', false], ['jump', false]]);
  });
  it('keeps refresh aliases and original bindings independent', () => {
    const bindings = { left: 'Digit1', right: 'Digit3', jump: 'Space' };
    expect(actionForKey('ArrowLeft', 'original', bindings)).toBeNull();
    expect(actionForKey('ArrowLeft', 'refresh', bindings)).toBe('left');
    expect(actionForKey('Digit1', 'original', bindings)).toBe('left');
  });
});
