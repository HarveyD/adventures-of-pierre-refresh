import { describe, expect, it } from 'vitest';
import { terrainSurfaces } from './terrainSurfaces';
import type { DynamicPlatform } from './runtime';

const platform = (ordinal: number, x: number, y: number, width: number, height: number, type: 0 | 3 = 0): DynamicPlatform => ({
  ordinal, label: 'terrain', x, y, width, height, type, baseX: x, baseY: y, currentX: x, currentY: y,
  movementRange: 0, movementOffset: 0, movementCounter: 0, movingPositive: true,
});
describe('Refresh terrain surfaces', () => {
  it('does not draw a buried cap across a taller intersecting wall', () => {
    const edges = terrainSurfaces([platform(1, 0, 100, 300, 500), platform(2, 100, 0, 30, 600)]);
    expect(edges.filter(edge => edge.ordinal === 1).map(edge => [edge.x, edge.width])).toEqual([[0, 100], [130, 170]]);
    expect(edges.find(edge => edge.ordinal === 2)).toMatchObject({ x: 100, y: 0, width: 30 });
  });
  it('does not cap a completely buried platform or double-cap equal-height overlaps', () => {
    expect(terrainSurfaces([platform(1, 0, 0, 300, 500), platform(2, 100, 100, 30, 20)]).map(edge => edge.ordinal)).toEqual([1]);
    const edges = terrainSurfaces([platform(1, 0, 100, 150, 100), platform(2, 100, 100, 150, 100)]);
    expect(edges.map(edge => [edge.x, edge.width])).toEqual([[0, 100], [100, 150]]);
    expect(edges.reduce((total, edge) => total + edge.width, 0)).toBe(250);
  });
  it('keeps adjacent and floating surfaces, caps thin platforms, and follows moving positions', () => {
    const moving = platform(3, 50, 20, 40, 3, 3); moving.currentX = 70;
    const edges = terrainSurfaces([platform(1, 0, 100, 100, 100), platform(2, 100, 100, 100, 100), moving]);
    expect(edges).toHaveLength(3);
    expect(edges.find(edge => edge.ordinal === 3)).toMatchObject({ x: 70, y: 20, height: 3, moving: true });
  });
  it('does not mutate collision geometry', () => {
    const platforms = [platform(1, 0, 100, 150, 100), platform(2, 100, 100, 150, 100)];
    const before = structuredClone(platforms); terrainSurfaces(platforms); expect(platforms).toEqual(before);
  });
  it('does not paint a safe-looking cap inside lethal terrain', () => {
    const floor = platform(1, 0, 525, 300, 500);
    const hazard = { ...platform(2, 0, 500, 300, 500), type: 5 as const };
    expect(terrainSurfaces([hazard, floor])).toEqual([]);
  });
});
