import type { DynamicPlatform } from './runtime';

export interface CheckpointMarker { ordinal: number; x: number; y: number; active: boolean }

export const checkpointMarkers = (platforms: readonly DynamicPlatform[], activeOrdinal: number): CheckpointMarker[] =>
  platforms.filter(p => p.type === 4).map(checkpoint => {
    const floors = platforms.filter(p => (p.type === 0 || p.type === 3)
      && checkpoint.currentX >= p.currentX && checkpoint.currentX < p.currentX + p.width
      && p.currentY >= checkpoint.currentY && p.currentY <= checkpoint.currentY + checkpoint.height);
    // Trigger boxes often extend underground; plant the pole on the actual surface.
    const y = floors.length ? Math.min(...floors.map(p => p.currentY)) : checkpoint.currentY;
    return { ordinal: checkpoint.ordinal, x: checkpoint.currentX, y, active: checkpoint.ordinal === activeOrdinal };
  });
