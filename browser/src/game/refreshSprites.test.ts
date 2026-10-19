import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { refreshSpriteAssets, refreshPlayerAnimations, REFRESH_PIERRE_SCALE, REFRESH_CORGI_SCALE } from './refreshSprites';

describe('Refresh pixel-art remasters', () => {
  it.each(refreshSpriteAssets)('ships a transparent high-resolution $key atlas with valid frames', asset => {
    const image = readFileSync(new URL('../../public/assets/refresh/sprites/' + asset.file, import.meta.url));
    expect([image.readUInt32BE(16), image.readUInt32BE(20)]).toEqual([asset.width, asset.height]);
    expect(image[25]).toBe(6);
    for (const [x, y, width, height] of asset.frames) {
      expect(width).toBeGreaterThan(200); expect(height).toBeGreaterThan(300);
      expect(x).toBeGreaterThanOrEqual(0); expect(y).toBeGreaterThanOrEqual(0);
      expect(x + width).toBeLessThanOrEqual(asset.width); expect(y + height).toBeLessThanOrEqual(asset.height);
    }
  });
  it('covers running, rising, falling, wall contact, idle and death without replacing Original', () => {
    expect(refreshPlayerAnimations['player-run-right']).toHaveLength(4);
    expect(refreshPlayerAnimations['player-wall-left']).toEqual([6]);
    for (const frames of Object.values(refreshPlayerAnimations)) for (const frame of frames) expect(frame).toBeLessThan(8);
    expect(refreshPlayerAnimations['player-rise-right']).toEqual([4]);
    expect(refreshPlayerAnimations['player-fall-right']).toEqual([5]);
    expect(refreshPlayerAnimations['player-death']).toEqual([7]);
  });
  it('keeps a constant pixel scale rather than resizing the body with each pose', () => {
    expect(refreshSpriteAssets[0].frames[0][3] * REFRESH_PIERRE_SCALE).toBeCloseTo(50);
    expect(365 * REFRESH_CORGI_SCALE).toBeCloseTo(33);
    expect(Math.max(...refreshSpriteAssets[1].frames.map(frame => frame[2] * REFRESH_CORGI_SCALE))).toBeLessThanOrEqual(50);
  });
});
