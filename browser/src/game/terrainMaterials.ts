export interface TerrainColors {
  body: number; grain: number; recess: number; fleck: number;
  top: number; highlight: number; rim: number; shadow: number;
}
export interface TerrainMaterial { name: string; pattern: 'stone' | 'sand' | 'blocks' | 'ice' | 'moon' | 'metal'; colors: TerrainColors }
export interface TerrainBounds { x: number; y: number; width: number; height: number }
export interface TerrainMark extends TerrainBounds { color: number }

export const TERRAIN_MATERIALS: readonly TerrainMaterial[] = [
  { name: 'Mossy stone', pattern: 'stone', colors: { body: 0x344c3b, grain: 0x3d5749, recess: 0x293e35, fleck: 0x526b53, top: 0x77ba63, highlight: 0xb4df8e, rim: 0x477a46, shadow: 0x23392f } },
  { name: 'Layered sandstone', pattern: 'sand', colors: { body: 0x825d46, grain: 0x976e4e, recess: 0x704b39, fleck: 0xb68a5d, top: 0xf1c77e, highlight: 0xffe8ad, rim: 0xbf8c54, shadow: 0x573e32 } },
  { name: 'Carved ruins', pattern: 'blocks', colors: { body: 0x4b6462, grain: 0x58726d, recess: 0x3b5150, fleck: 0x6c8277, top: 0xd9bf83, highlight: 0xf5dfa1, rim: 0x9b8c64, shadow: 0x304748 } },
  { name: 'Glacial ice', pattern: 'ice', colors: { body: 0x8fbacc, grain: 0xa3cbd8, recess: 0x77a3ba, fleck: 0xc0e0e7, top: 0xf3fcff, highlight: 0xffffff, rim: 0xc7e5ef, shadow: 0x5c8aa3 } },
  { name: 'Lunar rock', pattern: 'moon', colors: { body: 0x485363, grain: 0x535f71, recess: 0x384453, fleck: 0x748095, top: 0xb9c4d6, highlight: 0xe3e8f2, rim: 0x7e8da7, shadow: 0x303b4e } },
];

export const MOVING_MATERIAL: TerrainMaterial = {
  name: 'Amber lift', pattern: 'metal', colors: { body: 0x3a4b56, grain: 0x495d68, recess: 0x293a45, fleck: 0x90a9af,
    top: 0xefb652, highlight: 0xffde8c, rim: 0xac7636, shadow: 0x23323c },
};

export const TERRAIN_TILE_WIDTH = 256;
export const TERRAIN_TILE_HEIGHT = 128;
const hash = (x: number, y: number) => ((Math.imul((x % 4 + 4) % 4, 374761393) ^ Math.imul((y % 4 + 4) % 4, 668265263)) >>> 0);

// World-anchored cells produce identical pixels wherever static rectangles overlap.
export const terrainMarks = (material: TerrainMaterial, bounds: TerrainBounds): TerrainMark[] => {
  if (![bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite) || bounds.width <= 0 || bounds.height <= 0) return [];
  const marks: TerrainMark[] = [], c = material.colors;
  const add = (x: number, y: number, width: number, height: number, color: number) => {
    const left = Math.max(x, bounds.x), top = Math.max(y, bounds.y);
    const right = Math.min(x + width, bounds.x + bounds.width), bottom = Math.min(y + height, bounds.y + bounds.height);
    if (right > left && bottom > top) marks.push({ x: left, y: top, width: right - left, height: bottom - top, color });
  };
  const cellWidth = 64, cellHeight = 32;
  for (let row = Math.floor(bounds.y / cellHeight); row < Math.ceil((bounds.y + bounds.height) / cellHeight); row++) {
    for (let column = Math.floor(bounds.x / cellWidth); column < Math.ceil((bounds.x + bounds.width) / cellWidth); column++) {
      const seed = hash(column, row), x = column * cellWidth, y = row * cellHeight;
      const offset = 6 + seed % 16;
      switch (material.pattern) {
        case 'stone':
          add(x + offset, y + 8, 15 + seed % 9, 5, c.grain);
          add(x + offset + 4, y + 13, 11, 2, c.recess);
          add(x + 43, y + 27, 7, 4, c.grain);
          add(x + 46, y + 26, 3, 2, c.fleck);
          break;
        case 'sand':
          add(x, y + 12, 27 + seed % 17, 3, c.grain);
          add(x + 19, y + 30, 45, 2, c.recess);
          add(x + offset + 28, y + 21, 6, 3, c.fleck);
          break;
        case 'blocks': {
          const joint = row % 2 === 0 ? 0 : 32;
          add(x, y + 29, 64, 3, c.recess);
          add(x + joint, y, 3, 29, c.recess);
          add(x + joint + 7, y + 5, 21, 2, c.grain);
          add(x + 43, y + 28, 7, 3, c.grain);
          break;
        }
        case 'ice':
          add(x + 5, y + 9, 32 + seed % 18, 2, c.grain);
          add(x + offset + 17, y + 18, 2, 8, c.recess);
          add(x + offset + 13, y + 24, 4, 2, c.recess);
          add(x + 9, y + 27, 8, 2, c.fleck);
          break;
        case 'moon':
          add(x + offset + 2, y + 12, 16, 9, c.recess);
          add(x + offset, y + 14, 20, 5, c.recess);
          add(x + offset + 4, y + 14, 11, 4, c.grain);
          add(x + offset + 1, y + 11, 11, 2, c.fleck);
          add(x + 45, y + 27, 4, 3, c.grain);
          break;
        case 'metal':
          add(x, y + 19, 64, 2, c.recess);
          add(x + 14, y + 8, 3, 8, c.grain);
          add(x + 17, y + 5, 3, 8, c.grain);
          add(x + 45, y + 8, 4, 4, c.fleck);
          add(x + 46, y + 9, 2, 2, c.recess);
          break;
      }
    }
  }
  return marks;
};
