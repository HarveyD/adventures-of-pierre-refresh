import type { LegacyPlatform, RouteMode } from './types';

// Both directional sprites have a 50x33 opaque footprint on a 150x100 canvas.
export const CORGI_WIDTH = 50;
export const CORGI_HEIGHT = 33;
export interface EnemyState {
  id: number; x: number; y: number; alive: boolean; forward: boolean;
  minX: number; maxX: number; supportOrdinal: number;
}

export const spawnEnemies = (platforms: readonly LegacyPlatform[], mode: RouteMode, level: number): EnemyState[] => {
  const placements = [
    [{ support: 5, x: mode === 'original' ? 1550 : 1450 }],
    [{ support: 6, x: 1150 }, { support: 5, x: 1750 }],
    [{ support: 16, x: 4100 }],
    mode === 'refresh' ? [{ support: 13, x: 2500 }] : [],
    [],
  ][level] ?? [];
  const enemies: EnemyState[] = [];
  for (const placement of placements) {
    const support = platforms.find(p => p.ordinal === placement.support && p.type === 0);
    if (!support) continue;
    const y = support.y - CORGI_HEIGHT;
    let minX = Math.max(support.x, placement.x - 90);
    let maxX = Math.min(support.x + support.width - CORGI_WIDTH, placement.x + 150);
    // Clip the patrol to the clear part of its ledge, not just the floor's bounds.
    for (const p of platforms) {
      if (p.type === 2 || p.type === 4 || p.y >= support.y || p.y + p.height <= y) continue;
      if (p.x + p.width <= placement.x) minX = Math.max(minX, p.x + p.width);
      else if (p.x >= placement.x + CORGI_WIDTH) maxX = Math.min(maxX, p.x - CORGI_WIDTH);
      else { minX = Infinity; break; }
    }
    if (placement.x < minX || placement.x > maxX) continue;
    enemies.push({ id: enemies.length, x: placement.x, y, alive: true, forward: true, minX, maxX, supportOrdinal: support.ordinal });
  }
  return enemies;
};
