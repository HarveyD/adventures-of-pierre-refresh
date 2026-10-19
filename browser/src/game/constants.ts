export const GAME_WIDTH = 1280;
export const GAME_HEIGHT = 720;

export const PLAYER_SCREEN_X = 615;
export const PLAYER_SCREEN_Y = 450;
export const PLAYER_WORLD_OFFSET_X = 515;
export const PLAYER_WORLD_OFFSET_Y = 50;

export const WORLD_RENDER_OFFSET_X = 100;
export const WORLD_RENDER_OFFSET_Y = 400;

export const DEFAULT_CHECKPOINT_X = -100;
export const DEFAULT_LEVEL_ZERO_CHECKPOINT_Y = 230;
export const DEFAULT_LEVEL_CHECKPOINT_Y = 220;

// Sidescroller.java's AWT palette, confirmed by the creator's recollection.
export const ORIGINAL_PLATFORM_COLORS: Record<number, number> = {
  0: 0x000000,
  1: 0x0000ff,
  2: 0xffff00,
  3: 0xffc800,
  4: 0x00ff00,
  5: 0xff0000,
  6: 0xff0000,
};

export const REFRESH_PLATFORM_COLORS: Record<number, number> = {
  0: 0x3a4f6e,
  1: 0x69d5ff,
  2: 0xffd166,
  3: 0xff8f5a,
  4: 0x7fe388,
  5: 0xff667a,
  6: 0xff4d5a,
};
