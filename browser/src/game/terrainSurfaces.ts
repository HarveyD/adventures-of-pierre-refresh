import type { DynamicPlatform } from './runtime';

export interface TerrainSurface { ordinal: number; x: number; y: number; width: number; height: number; moving: boolean }

// Only exposed top edges get a cap. Buried rectangle boundaries are not terrain edges.
export const terrainSurfaces = (platforms: readonly DynamicPlatform[], depth = 6): TerrainSurface[] => {
  const solids = platforms.filter(p => p.type === 0 || p.type === 3);
  const blockers = platforms.filter(p => [0, 1, 3, 5, 6].includes(p.type));
  const order = new Map(solids.map((platform, index) => [platform, index]));
  return solids.flatMap((platform, index) => {
    let spans = [[platform.currentX, platform.currentX + platform.width]];
    blockers.forEach(other => {
      if (platform === other || other.currentY > platform.currentY || other.currentY + other.height <= platform.currentY) return;
      if (other.currentY === platform.currentY && (order.get(other) ?? Infinity) < index) return;
      spans = spans.flatMap(([left, right]) => {
        const start = Math.max(left, other.currentX), end = Math.min(right, other.currentX + other.width);
        if (start >= end) return [[left, right]];
        return [[left, start], [end, right]].filter(([a, b]) => b > a);
      });
    });
    return spans.map(([left, right]) => ({ ordinal: platform.ordinal, x: left, y: platform.currentY,
      width: right - left, height: Math.min(depth, platform.height), moving: platform.type === 3 }));
  });
};
