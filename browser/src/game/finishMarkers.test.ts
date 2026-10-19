import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { finishMarkers } from './finishMarkers';
import { parseLegacyLevels } from './levelParser';
import { PierreRuntime } from './runtime';

const campaign = parseLegacyLevels(readFileSync(new URL('../../public/assets/original/data/Levels2.txt', import.meta.url), 'utf8'));
describe('Refresh finish presentation', () => {
  it('mounts every chapter finish on its actual supporting floor', () => {
    const runtime = new PierreRuntime(campaign, 'refresh');
    for (let level = 0; level < 5; level++) {
      runtime.selectLevel(level); const markers = finishMarkers(runtime.platforms, level === 4);
      expect(markers).toHaveLength(1);
      const marker = markers[0]; expect(marker.locked).toBe(level === 4);
      expect(runtime.platforms.some(p => p.type === 0 && marker.x >= p.currentX && marker.x < p.currentX + p.width && marker.y === p.currentY)).toBe(true);
      expect(finishMarkers(runtime.platforms, false)[0].locked).toBe(false);
    }
  });
  it('does not move the actual finish trigger or change chapter completion', () => {
    const runtime = new PierreRuntime(campaign, 'refresh'); const before = structuredClone(runtime.platforms);
    finishMarkers(runtime.platforms, false); expect(runtime.platforms).toEqual(before);
    const finish = runtime.platforms.find(p => p.type === 2)!;
    runtime.debugController.warpTo(finish.currentX - 515, finish.currentY - 100); runtime.update(5);
    expect(runtime.snapshot.levelIndex).toBe(1);
  });
});
