import { describe, expect, it } from 'vitest';
import { terrainEdges } from './terrainEdges';
import type { DynamicPlatform } from './runtime';

const block = (ordinal: number, x: number, y: number, width: number, height: number): DynamicPlatform => ({
  ordinal, label: 'terrain', x, y, width, height, type: 0, baseX: x, baseY: y, currentX: x, currentY: y,
  movementRange: 0, movementOffset: 0, movementCounter: 0, movingPositive: true,
});
describe('exterior terrain bevels', () => {
  it('omits shared edges between adjacent rectangles', () => {
    const edges = terrainEdges([block(1, 0, 0, 100, 100), block(2, 100, 0, 100, 100)]);
    expect(edges.filter(edge => edge.side !== 'bottom').map(edge => [edge.side, edge.x])).toEqual([['left', 0], ['right', 200]]);
  });
  it('clips a wall edge and bottom where it intersects the floor', () => {
    const edges = terrainEdges([block(1, 0, 100, 300, 200), block(2, 100, 0, 30, 200)]);
    const wall = edges.filter(edge => edge.ordinal === 2);
    expect(wall.map(edge => [edge.side, edge.y, edge.length])).toEqual([['left', 0, 100], ['right', 0, 100]]);
  });
  it('does not outline the join between stacked platforms or inside a hazard', () => {
    const top = block(1, 0, 0, 100, 100), below = block(2, 0, 100, 100, 100);
    expect(terrainEdges([top, below]).filter(edge => edge.side === 'bottom').map(edge => edge.y)).toEqual([200]);
    const hazard = { ...block(3, -10, -10, 120, 220), type: 5 as const };
    expect(terrainEdges([top, hazard])).toEqual([]);
  });
});
