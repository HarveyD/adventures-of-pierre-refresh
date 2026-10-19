import { describe, expect, it } from 'vitest';
import { backgroundLayout } from './backgroundLayout';

describe('non-repeating landscape', () => {
  it.each([
    [1280, 720], [640, 960], [1920, 1080], [844, 390],
  ])('covers a %i x %i viewport at every camera extreme without stretching the artwork', (width, height) => {
    for (const cameraX of [-10000, -200, 0, 100, 2400, 20000]) {
      for (const cameraY of [-10000, -160, 0, 240, 20000]) {
        const layout = backgroundLayout(1280, 720, width, height, cameraX, cameraY);
        expect(layout.x).toBeLessThanOrEqual(0);
        expect(layout.y).toBeLessThanOrEqual(0);
        expect(layout.x + layout.width).toBeGreaterThanOrEqual(width);
        expect(layout.y + layout.height).toBeGreaterThanOrEqual(height);
        expect(layout.width / layout.height).toBeCloseTo(1280 / 720);
      }
    }
  });
  it('never shifts or wraps a viewport-sized background when the player moves or jumps', () => {
    for (const [x, y] of [[-200, -160], [2800, -750], [5000, 1500]]) {
      const layout = backgroundLayout(1280, 720, 1280, 720, x, y);
      expect(layout.x).toBe(0);
      expect(layout.y).toBe(0);
      expect(layout.width).toBe(1280);
      expect(layout.height).toBe(720);
    }
  });
  it('bounds portrait parallax instead of bringing a second copy into view', () => {
    const start = backgroundLayout(1280, 720, 640, 960, -100, -500);
    const middle = backgroundLayout(1280, 720, 640, 960, 800, 0);
    const end = backgroundLayout(1280, 720, 640, 960, 20000, 10000);
    expect(start.x).toBe(0);
    expect(middle.x).toBe(-100);
    expect(end.x + end.width).toBe(640);
    expect(end.y).toBe(0);
  });
});
