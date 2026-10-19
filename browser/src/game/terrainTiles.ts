import type Phaser from 'phaser';
import type { DynamicPlatform } from './runtime';
import { MOVING_MATERIAL, TERRAIN_MATERIALS, TERRAIN_TILE_HEIGHT, TERRAIN_TILE_WIDTH, terrainMarks } from './terrainMaterials';

export const terrainTileLayout = (platforms: readonly DynamicPlatform[], level: number, cameraX: number, cameraY: number, viewWidth: number, viewHeight: number) =>
  platforms.filter(platform => platform.type === 0 || platform.type === 3).flatMap(platform => {
    const left = Math.floor(Math.max(-4, platform.currentX - cameraX)), top = Math.floor(Math.max(-4, platform.currentY - cameraY));
    const right = Math.ceil(Math.min(viewWidth + 4, platform.currentX + platform.width - cameraX));
    const bottom = Math.ceil(Math.min(viewHeight + 4, platform.currentY + platform.height - cameraY));
    if (right <= left || bottom <= top) return [];
    const moving = platform.type === 3;
    return [{ x: left, y: top, width: right - left, height: bottom - top,
      tileX: left + cameraX - (moving ? platform.currentX : 0), tileY: top + cameraY - (moving ? platform.currentY : 0),
      material: moving ? TERRAIN_MATERIALS.length : level }];
  });

// Bake each small repeating material once, then reuse a bounded pool of visible quads.
export class TerrainTiles {
  private readonly container: Phaser.GameObjects.Container;
  private readonly tiles: { sprite: Phaser.GameObjects.TileSprite; key: string }[] = [];
  constructor(private readonly scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0);
    [...TERRAIN_MATERIALS, MOVING_MATERIAL].forEach((material, index) => {
      const graphics = scene.add.graphics();
      graphics.fillStyle(material.colors.body); graphics.fillRect(0, 0, TERRAIN_TILE_WIDTH, TERRAIN_TILE_HEIGHT);
      for (const mark of terrainMarks(material, { x: 0, y: 0, width: TERRAIN_TILE_WIDTH, height: TERRAIN_TILE_HEIGHT })) {
        graphics.fillStyle(mark.color); graphics.fillRect(mark.x, mark.y, mark.width, mark.height);
      }
      graphics.generateTexture('terrain-material-' + index, TERRAIN_TILE_WIDTH, TERRAIN_TILE_HEIGHT); graphics.destroy();
    });
  }
  render(platforms: readonly DynamicPlatform[], level: number, cameraX: number, cameraY: number, viewWidth: number, viewHeight: number): void {
    const layout = terrainTileLayout(platforms, level, cameraX, cameraY, viewWidth, viewHeight);
    layout.forEach((rect, index) => {
      const key = 'terrain-material-' + rect.material;
      let entry = this.tiles[index];
      if (!entry) {
        const sprite = this.scene.add.tileSprite(0, 0, 1, 1, key).setOrigin(0);
        entry = { sprite, key };
        this.container.add(sprite); this.tiles.push(entry);
      }
      const tile = entry.sprite;
      if (entry.key !== key) { tile.setTexture(key); entry.key = key; }
      if (tile.width !== rect.width || tile.height !== rect.height) tile.setSize(rect.width, rect.height);
      tile.setVisible(true).setPosition(rect.x, rect.y).setTilePosition(rect.tileX, rect.tileY);
    });
    for (let index = layout.length; index < this.tiles.length; index++) this.tiles[index].sprite.setVisible(false);
  }
  get count() { return this.tiles.length; }
  destroy(): void { this.container.destroy(true); }
}
