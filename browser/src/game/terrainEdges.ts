import type { DynamicPlatform } from './runtime';

export interface TerrainEdge { side: 'left' | 'right' | 'bottom'; x: number; y: number; length: number; ordinal: number }

export const terrainEdges = (platforms: readonly DynamicPlatform[]): TerrainEdge[] => {
  const solids = platforms.filter(p => p.type === 0 || p.type === 3);
  const blockers = platforms.filter(p => [0, 1, 3, 5, 6].includes(p.type));
  return solids.flatMap(platform => (['left', 'right', 'bottom'] as const).flatMap(side => {
    const horizontal = side === 'bottom';
    const boundary = horizontal ? platform.currentY + platform.height : platform.currentX + (side === 'right' ? platform.width : 0);
    let spans = [[horizontal ? platform.currentX : platform.currentY, horizontal ? platform.currentX + platform.width : platform.currentY + platform.height]];
    for (const other of blockers) {
      if (other === platform) continue;
      const covers = horizontal ? other.currentY <= boundary && other.currentY + other.height > boundary
        : side === 'left' ? other.currentX < boundary && other.currentX + other.width >= boundary
          : other.currentX <= boundary && other.currentX + other.width > boundary;
      if (!covers) continue;
      const start = horizontal ? other.currentX : other.currentY;
      const end = start + (horizontal ? other.width : other.height);
      spans = spans.flatMap(([a, b]) => start >= b || end <= a ? [[a, b]]
        : [[a, Math.max(a, start)], [Math.min(b, end), b]].filter(([left, right]) => right > left));
    }
    return spans.map(([start, end]) => ({ side, x: horizontal ? start : boundary, y: horizontal ? boundary : start, length: end - start, ordinal: platform.ordinal }));
  }));
};
