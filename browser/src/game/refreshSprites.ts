export const refreshSpriteAssets = [
  { key: 'refresh-pierre', file: 'pierre-pixel-baguette-v2.png', width: 1470, height: 1070,
    frames: [[65, 110, 234, 390], [404, 110, 283, 381], [791, 110, 246, 395], [1143, 110, 280, 392],
      [73, 571, 277, 386], [387, 573, 328, 411], [796, 573, 270, 386], [1154, 679, 281, 327]] },
  { key: 'refresh-corgi', file: 'corgi-pixel-v1.png', width: 1448, height: 1086,
    frames: [[99, 113, 527, 365], [829, 115, 546, 363], [107, 633, 544, 358], [837, 632, 539, 359]] },
] as const;

export const REFRESH_PIERRE_SCALE = 50 / refreshSpriteAssets[0].frames[0][3];
export const REFRESH_CORGI_SCALE = 33 / 365;
export const REFRESH_BOSS_SCALE = 90 / 546;

export const refreshPlayerAnimations: Record<string, readonly number[]> = {
  'player-idle': [0], 'player-run-right': [1, 2, 3, 2], 'player-run-left': [1, 2, 3, 2],
  'player-rise-right': [4], 'player-rise-left': [4], 'player-fall-right': [5], 'player-fall-left': [5],
  'player-wall-right': [6], 'player-wall-left': [6], 'player-death': [7],
};
