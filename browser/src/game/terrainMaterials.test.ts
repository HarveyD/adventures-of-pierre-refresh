import { describe, expect, it } from 'vitest';
import { MOVING_MATERIAL, TERRAIN_MATERIALS, TERRAIN_TILE_WIDTH, TERRAIN_TILE_HEIGHT, terrainMarks } from './terrainMaterials';

describe('Refresh terrain materials', () => {
  it('provides distinct chapter materials and a consistent amber moving platform', () => {
    expect(TERRAIN_MATERIALS.map(material => material.pattern)).toEqual(['stone', 'sand', 'blocks', 'ice', 'moon']);
    expect(new Set(TERRAIN_MATERIALS.map(material => material.colors.body)).size).toBe(5);
    expect(MOVING_MATERIAL.pattern).toBe('metal');
    const brightness = (color: number) => (color >> 16) * 54 + ((color >> 8) & 255) * 183 + (color & 255) * 19;
    for (const material of [...TERRAIN_MATERIALS, MOVING_MATERIAL]) expect(brightness(material.colors.highlight)).toBeGreaterThan(brightness(material.colors.body));
  });
  it.each([...TERRAIN_MATERIALS, MOVING_MATERIAL])('keeps $name details deterministic, clipped and bounded', material => {
    const bounds = { x: -13, y: -27, width: 1280, height: 720 };
    const marks = terrainMarks(material, bounds);
    expect(marks.length).toBeGreaterThan(0); expect(marks.length).toBeLessThan(2800);
    expect(marks).toEqual(terrainMarks(material, bounds));
    for (const mark of marks) {
      expect(mark.x).toBeGreaterThanOrEqual(bounds.x); expect(mark.y).toBeGreaterThanOrEqual(bounds.y);
      expect(mark.x + mark.width).toBeLessThanOrEqual(bounds.x + bounds.width);
      expect(mark.y + mark.height).toBeLessThanOrEqual(bounds.y + bounds.height);
      expect(mark.width).toBeGreaterThan(0); expect(mark.height).toBeGreaterThan(0);
      expect(Object.values(material.colors)).toContain(mark.color);
    }
  });
  it('ignores empty or invalid bounds', () => {
    const material = TERRAIN_MATERIALS[0];
    expect(terrainMarks(material, { x: 0, y: 0, width: 0, height: 10 })).toEqual([]);
    expect(terrainMarks(material, { x: NaN, y: 0, width: 10, height: 10 })).toEqual([]);
  });
  it('repeats on power-of-two boundaries without resampling or texture joins', () => {
    expect(TERRAIN_TILE_WIDTH & (TERRAIN_TILE_WIDTH - 1)).toBe(0);
    expect(TERRAIN_TILE_HEIGHT & (TERRAIN_TILE_HEIGHT - 1)).toBe(0);
    for (const material of TERRAIN_MATERIALS) {
      const first = terrainMarks(material, { x: 0, y: 0, width: 256, height: 128 });
      const next = terrainMarks(material, { x: 256, y: 128, width: 256, height: 128 });
      expect(next.map(mark => ({ ...mark, x: mark.x - 256, y: mark.y - 128 }))).toEqual(first);
    }
  });
});
