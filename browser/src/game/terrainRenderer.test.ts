import type Phaser from 'phaser';
import { describe, expect, it } from 'vitest';
import { drawRefreshTerrain, drawRefreshTrampoline } from './terrainRenderer';
import { MOVING_MATERIAL, TERRAIN_MATERIALS, terrainMarks } from './terrainMaterials';
import { terrainTileLayout } from './terrainTiles';
import type { DynamicPlatform } from './runtime';

const block = (ordinal: number, x: number, y: number, width: number, height: number, type: 0 | 3 = 0): DynamicPlatform => ({
  ordinal, label: 'terrain', x, y, width, height, type, baseX: x, baseY: y, currentX: x, currentY: y,
  movementRange: 0, movementOffset: 0, movementCounter: 0, movingPositive: true,
});
const draw = (platforms: DynamicPlatform[], cameraX = 0, cameraY = 0) => {
  let color = 0;
  const rectangles: { x: number; y: number; width: number; height: number; color: number }[] = [];
  const graphics = { fillStyle: (value: number) => { color = value; }, fillRect: (x: number, y: number, width: number, height: number) => { rectangles.push({ x, y, width, height, color }); } };
  for (const tile of terrainTileLayout(platforms, 0, cameraX, cameraY, 300, 200)) {
    const material = tile.material === TERRAIN_MATERIALS.length ? MOVING_MATERIAL : TERRAIN_MATERIALS[tile.material];
    graphics.fillStyle(material.colors.body); graphics.fillRect(tile.x, tile.y, tile.width, tile.height);
    for (const mark of terrainMarks(material, { x: tile.tileX, y: tile.tileY, width: tile.width, height: tile.height })) {
      graphics.fillStyle(mark.color); graphics.fillRect(mark.x - tile.tileX + tile.x, mark.y - tile.tileY + tile.y, mark.width, mark.height);
    }
  }
  drawRefreshTerrain(graphics as unknown as Phaser.GameObjects.Graphics, platforms, 0, cameraX, cameraY, 300, 200);
  const at = (x: number, y: number) => rectangles.filter(rect => x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height).at(-1)?.color;
  return { rectangles, at };
};
describe('terrain material rendering', () => {
  it('does not introduce a seam where textured rectangles intersect', () => {
    const joined = [block(1, 0, 0, 150, 200), block(2, 100, 0, 150, 200)];
    const rendered = draw(joined), material = TERRAIN_MATERIALS[0];
    const marks = terrainMarks(material, { x: 0, y: 0, width: 250, height: 200 });
    for (const x of [98, 99, 100, 101, 148, 149, 150, 151]) {
      const expected = marks.filter(mark => x >= mark.x && x < mark.x + mark.width && 70 >= mark.y && 70 < mark.y + mark.height).at(-1)?.color ?? material.colors.body;
      expect(rendered.at(x, 70)).toBe(expected);
    }
  });
  it('keeps static texture fixed in world space when the camera moves', () => {
    const terrain = [block(1, -100, -100, 700, 600)];
    const before = draw(terrain), after = draw(terrain, 80, 20);
    for (const [x, y] of [[130, 80], [180, 120], [220, 170]]) expect(after.at(x - 80, y - 20)).toBe(before.at(x, y));
  });
  it('moves a lift texture with the platform rather than sliding it through the body', () => {
    const lift = block(1, 0, 0, 200, 80, 3);
    const before = draw([lift]); lift.currentX += 20; lift.currentY += 10;
    const after = draw([lift]);
    for (const [x, y] of [[46, 32], [78, 30], [140, 25]]) expect(after.at(x + 20, y + 10)).toBe(before.at(x, y));
  });
  it('clips draw work to the viewport and leaves collision data unchanged', () => {
    const terrain = [block(1, -10000, -10000, 30000, 30000)];
    const before = structuredClone(terrain), rendered = draw(terrain);
    expect(terrain).toEqual(before); expect(rendered.rectangles.length).toBeLessThan(300);
    for (const rect of rendered.rectangles) {
      expect(rect.x).toBeGreaterThanOrEqual(-4); expect(rect.y).toBeGreaterThanOrEqual(-4);
      expect(rect.x + rect.width).toBeLessThanOrEqual(304); expect(rect.y + rect.height).toBeLessThanOrEqual(204);
    }
  });
  it('keeps the spring illustration inside the existing trampoline bounds', () => {
    const points: number[][] = [];
    const graphics = { fillStyle: () => {}, lineStyle: () => {},
      fillRect: (x: number, y: number, width: number, height: number) => { points.push([x, y], [x + width, y + height]); },
      lineBetween: (x: number, y: number, x2: number, y2: number) => { points.push([x, y], [x2, y2]); } };
    drawRefreshTrampoline(graphics as unknown as Phaser.GameObjects.Graphics, 100, 200, 150, 25);
    expect(points.length).toBeGreaterThan(30);
    for (const [x, y] of points) {
      expect(x).toBeGreaterThanOrEqual(100); expect(x).toBeLessThanOrEqual(250);
      expect(y).toBeGreaterThanOrEqual(200); expect(y).toBeLessThanOrEqual(225);
    }
  });
});
