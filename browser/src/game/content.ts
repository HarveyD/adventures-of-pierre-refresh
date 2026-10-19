import type { LegacyCampaign, LegacyLevel, LegacyPlatform, PlatformType, RouteMode } from './types';

const block = (ordinal: number, label: string, x: number, y: number, width: number, height: number, type: PlatformType = 0): LegacyPlatform =>
  ({ ordinal, label, x, y, width, height, type, movementRange: 0, movementOffset: 0 });

export const levelContent = (campaign: LegacyCampaign, mode: RouteMode, index: number): LegacyLevel => {
  const source = campaign.levels[index];
  let platforms = source.platforms.map(platform => ({ ...platform }));
  if (mode === 'refresh' && index === 3) {
    // Move the draft's early exit beyond the snow level's existing obstacles.
    platforms = platforms.filter(platform => platform.type !== 2 && platform.ordinal !== 12 && !platform.label.startsWith('anti cheat'));
    platforms.push(
      block(24, 'snow approach', 1100, 250, 100, 20),
      block(25, 'far ledge', 3500, 340, 650, 2000),
      block(26, 'snow exit', 4020, 290, 12, 50, 2),
      block(27, 'snow bridge', 1850, 200, 150, 20),
      block(28, 'upper snow step', 2070, 50, 100, 20),
    );
  }
  if (mode === 'refresh' && index === 4) {
    platforms = [
      block(1, 'arena floor', 200, 340, 2100, 1000),
      block(2, 'left boundary', 160, -500, 40, 1500),
      block(3, 'right boundary', 2300, -500, 40, 1500),
      block(4, 'launch platform', 700, 250, 160, 20),
      block(5, 'middle platform', 1030, 210, 160, 20),
      block(6, 'high platform', 1380, 150, 180, 20),
      block(7, 'boss approach', 1740, 230, 200, 20),
      block(8, 'arena checkpoint', 620, 290, 8, 50, 4),
      block(9, 'feast', 2180, 290, 16, 50, 2),
      block(10, 'arena recovery step', 1600, 280, 120, 20),
    ];
  }
  return { ...source, platformCount: platforms.length, platforms };
};
