import type Phaser from 'phaser';
import type { DynamicPlatform } from './runtime';
import { terrainSurfaces } from './terrainSurfaces';
import { terrainEdges } from './terrainEdges';
import { MOVING_MATERIAL, TERRAIN_MATERIALS } from './terrainMaterials';

export const drawRefreshTerrain = (graphics: Phaser.GameObjects.Graphics, platforms: readonly DynamicPlatform[], level: number,
  cameraX: number, cameraY: number, viewWidth: number, viewHeight: number): void => {
  const material = TERRAIN_MATERIALS[level];
  const solids = platforms.filter(p => p.type === 0 || p.type === 3);
  const byOrdinal = new Map(solids.map(platform => [platform.ordinal, platform]));
  const rect = (x: number, y: number, width: number, height: number, color: number) => {
    if (width <= 0 || height <= 0) return;
    const left = Math.floor(Math.max(-4, x - cameraX)), top = Math.floor(Math.max(-4, y - cameraY));
    const right = Math.ceil(Math.min(viewWidth + 4, x + width - cameraX)), bottom = Math.ceil(Math.min(viewHeight + 4, y + height - cameraY));
    if (right <= left || bottom <= top) return;
    graphics.fillStyle(color); graphics.fillRect(left, top, right - left, bottom - top);
  };
  // Bevel only the terrain's silhouette, not the rectangles used by collision geometry.
  for (const edge of terrainEdges(platforms)) {
    const platform = byOrdinal.get(edge.ordinal)!;
    const c = (platform.type === 3 ? MOVING_MATERIAL : material).colors;
    if (edge.side === 'bottom') rect(edge.x, edge.y - Math.min(3, platform.height), edge.length, Math.min(3, platform.height), c.shadow);
    else if (edge.side === 'left') rect(edge.x, edge.y, Math.min(2, platform.width), edge.length, c.grain);
    else rect(edge.x - Math.min(3, platform.width), edge.y, Math.min(3, platform.width), edge.length, c.shadow);
  }
  for (const surface of terrainSurfaces(platforms, 13)) {
    const platform = byOrdinal.get(surface.ordinal)!;
    const c = (surface.moving ? MOVING_MATERIAL : material).colors;
    const { x, y, width, height } = surface;
    rect(x, y, width, height, c.shadow);
    rect(x, y, width, Math.min(10, height), c.rim);
    rect(x, y, width, Math.min(5, height), c.top);
    rect(x, y, width, Math.min(2, height), c.highlight);
    const origin = surface.moving ? platform.currentX : 0;
    const visibleLeft = Math.max(x, cameraX - 24), visibleRight = Math.min(x + width, cameraX + viewWidth + 24);
    for (let column = Math.floor((visibleLeft - origin) / 24); column < Math.ceil((visibleRight - origin) / 24); column++) {
      const start = Math.max(x, origin + column * 24 + 6), end = Math.min(x + width, origin + column * 24 + 14);
      if (end <= start) continue;
      if (surface.moving || material.pattern === 'blocks') {
        if (height > 3) rect(start, y + 3, Math.min(2, end - start), Math.min(7, height - 3), c.shadow);
      } else {
        if (height > 5) rect(start, y + 5, end - start, Math.min(column % 2 === 0 ? 5 : 3, height - 5), c.top);
        if (height > 2) rect(start + 1, y + 2, Math.max(0, end - start - 2), Math.min(2, height - 2), c.highlight);
      }
    }
  }
};

export const drawRefreshTrampoline = (graphics: Phaser.GameObjects.Graphics, x: number, y: number, width: number, height: number): void => {
  graphics.fillStyle(0x173b70); graphics.fillRect(x, y, width, height);
  graphics.fillStyle(0x32639a); graphics.fillRect(x + 3, y + 5, Math.max(0, width - 6), Math.max(0, height - 9));
  graphics.lineStyle(2, 0xd2f5ff);
  for (let spring = x + 10; spring < x + width - 6; spring += 22) {
    const top = y + Math.min(7, height / 3), bottom = y + height - 4;
    for (let coil = 0; coil < 4; coil++) graphics.lineBetween(spring + (coil % 2 ? 3 : -3), top + (bottom - top) * coil / 4,
      spring + (coil % 2 ? -3 : 3), top + (bottom - top) * (coil + 1) / 4);
  }
  graphics.fillStyle(0x54cce7); graphics.fillRect(x, y, width, Math.min(5, height));
  graphics.fillStyle(0xd8fbff); graphics.fillRect(x, y, width, Math.min(2, height));
};
