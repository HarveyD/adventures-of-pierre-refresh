import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { checkpointMarkers } from './checkpointMarkers';
import { ORIGINAL_PLATFORM_COLORS } from './constants';
import { parseLegacyLevels } from './levelParser';
import { PierreRuntime, type DynamicPlatform } from './runtime';

const campaign = parseLegacyLevels(readFileSync(new URL('../../public/assets/original/data/Levels2.txt', import.meta.url), 'utf8'));
const advance = (runtime: PierreRuntime, ms: number) => { for (let time = 0; time < ms; time += 5) runtime.update(5); };

describe('checkpoint presentation', () => {
  it.each(['original', 'refresh'] as const)('provides an unselected, surface-mounted flag for every %s checkpoint', mode => {
    const runtime = new PierreRuntime(campaign, mode);
    for (let level = 0; level < 5; level++) {
      runtime.selectLevel(level);
      const markers = checkpointMarkers(runtime.platforms, runtime.snapshot.checkpointOrdinal);
      expect(markers).toHaveLength(runtime.platforms.filter(p => p.type === 4).length);
      for (const marker of markers) {
        expect(marker.active).toBe(false);
        expect(runtime.platforms.some(p => (p.type === 0 || p.type === 3) && marker.x >= p.currentX
          && marker.x < p.currentX + p.width && marker.y === p.currentY)).toBe(true);
      }
    }
  });
  it.each(['original', 'refresh'] as const)('highlights exactly the selected %s flag, preserves it on death, and clears it on restart', mode => {
    const runtime = new PierreRuntime(campaign, mode);
    const trigger = runtime.platforms.find(p => p.type === 4)!;
    runtime.debugController.warpTo(trigger.currentX - 515, trigger.currentY - 50);
    runtime.update(5);
    const selected = () => checkpointMarkers(runtime.platforms, runtime.snapshot.checkpointOrdinal).filter(marker => marker.active);
    expect(runtime.snapshot.checkpointOrdinal).toBe(trigger.ordinal);
    expect(selected().map(marker => marker.ordinal)).toEqual([trigger.ordinal]);
    runtime.debugController.warpTo(0, 500); runtime.update(5); advance(runtime, 365);
    expect(runtime.snapshot.lives).toBe(4);
    expect(selected().map(marker => marker.ordinal)).toEqual([trigger.ordinal]);
    runtime.restartLevel(); expect(selected()).toEqual([]);
  });
  it('uses the ground rather than the bottom of an underground trigger, regardless of draw order', () => {
    const runtime = new PierreRuntime(campaign, 'original');
    const trigger = runtime.platforms.find(p => p.type === 4)!;
    const floor = runtime.platforms.find(p => p.ordinal === 5)!;
    for (const platforms of [[trigger, floor], [floor, trigger]]) {
      expect(checkpointMarkers(platforms, -1)[0].y).toBe(340);
    }
    const unsupported = { ...trigger, currentY: -100 } as DynamicPlatform;
    expect(checkpointMarkers([unsupported], -1)[0].y).toBe(-100);
  });
  it('uses the larger draft\'s exact AWT colours in Original', () => {
    expect(ORIGINAL_PLATFORM_COLORS).toEqual({
      0: 0x000000, 1: 0x0000ff, 2: 0xffff00, 3: 0xffc800, 4: 0x00ff00, 5: 0xff0000, 6: 0xff0000,
    });
  });
});
