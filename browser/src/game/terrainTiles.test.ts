import type Phaser from 'phaser';
import { describe, expect, it, vi } from 'vitest';
import { TerrainTiles, terrainTileLayout } from './terrainTiles';
import type { DynamicPlatform } from './runtime';

const block = (ordinal: number, x = 0, type: 0 | 3 = 0): DynamicPlatform => ({ ordinal, label: 'terrain', x, y: 0, width: 100, height: 100,
  type, baseX: x, baseY: 0, currentX: x, currentY: 0, movementRange: 0, movementOffset: 0, movementCounter: 0, movingPositive: true });

const makeScene = () => {
  const baked = { fillStyle: vi.fn(), fillRect: vi.fn(), generateTexture: vi.fn(), destroy: vi.fn() };
  const container = { add: vi.fn(), destroy: vi.fn() };
  const tiles: { displayTexture: { key: string }; width: number; height: number; visible: boolean; setTexture: ReturnType<typeof vi.fn>; setSize: ReturnType<typeof vi.fn> }[] = [];
  const scene = { add: {
    graphics: vi.fn(() => baked), container: vi.fn(() => container),
    tileSprite: vi.fn((_x: number, _y: number, width: number, height: number, key: string) => {
      const tile = { texture: { key: 'internal-canvas' }, displayTexture: { key }, width, height, visible: true,
        setOrigin: () => tile,
        setTexture: vi.fn((value: string) => { tile.displayTexture.key = value; return tile; }),
        setSize: vi.fn((w: number, h: number) => { tile.width = w; tile.height = h; return tile; }),
        setVisible: (visible: boolean) => { tile.visible = visible; return tile; }, setPosition: () => tile, setTilePosition: () => tile };
      tiles.push(tile); return tile;
    }),
  } };
  return { scene: scene as unknown as Phaser.Scene, baked, container, tiles };
};
describe('cached terrain tiles', () => {
  it('bakes materials once and does not re-upload the same texture every frame', () => {
    const fake = makeScene(), terrain = new TerrainTiles(fake.scene), platforms = [block(1), block(2, 150, 3)];
    for (let frame = 0; frame < 100; frame++) terrain.render(platforms, 0, 0, 0, 300, 200);
    expect(fake.baked.generateTexture).toHaveBeenCalledTimes(6); expect(fake.baked.destroy).toHaveBeenCalledTimes(6);
    expect(terrain.count).toBe(2); expect(fake.tiles.every(tile => tile.setTexture.mock.calls.length === 0)).toBe(true);
    expect(fake.tiles.every(tile => tile.setSize.mock.calls.length === 1)).toBe(true);
  });
  it('reuses the pool for chapter changes, hides unused tiles, and destroys owned objects', () => {
    const fake = makeScene(), terrain = new TerrainTiles(fake.scene), platforms = [block(1), block(2, 150)];
    terrain.render(platforms, 0, 0, 0, 300, 200); terrain.render(platforms, 3, 0, 0, 300, 200);
    expect(fake.tiles[0].displayTexture.key).toBe('terrain-material-3');
    terrain.render(platforms, 3, 150, 0, 300, 200);
    expect(terrain.count).toBe(2); expect(fake.tiles[1].visible).toBe(false);
    terrain.destroy(); expect(fake.container.destroy).toHaveBeenCalledWith(true);
  });
  it('clips body tiles and preserves world or moving-local texture origins', () => {
    const moving = block(2, 150, 3);
    const layout = terrainTileLayout([block(1), moving, block(3, 10000)], 2, 20, 0, 300, 200);
    expect(layout).toHaveLength(2);
    expect(layout[0]).toMatchObject({ x: -4, tileX: 16, material: 2 });
    expect(layout[1]).toMatchObject({ x: 130, tileX: 0, material: 5 });
  });
});
