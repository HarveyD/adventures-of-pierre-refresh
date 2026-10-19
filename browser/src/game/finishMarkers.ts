import type { DynamicPlatform } from './runtime';

export interface FinishMarker { ordinal: number; x: number; y: number; locked: boolean }

export const finishMarkers = (platforms: readonly DynamicPlatform[], locked: boolean): FinishMarker[] =>
  platforms.filter(p => p.type === 2).map(trigger => {
    const x = trigger.currentX + trigger.width / 2;
    const floors = platforms.filter(p => (p.type === 0 || p.type === 3) && x >= p.currentX && x < p.currentX + p.width
      && p.currentY >= trigger.currentY && p.currentY <= trigger.currentY + trigger.height + 1);
    return { ordinal: trigger.ordinal, x, y: floors.length ? Math.min(...floors.map(p => p.currentY)) : trigger.currentY + trigger.height, locked };
  });
