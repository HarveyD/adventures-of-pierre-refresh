import type { RouteMode } from './types';

export const LEVEL_NAMES = ['The training grounds', 'High country', 'The moving maze', 'Snowbound', 'The moonlit feast'];
export const MODE_CONFIG = {
  original: { coyoteMs: 0, bufferMs: 0, checkpointY: 250, enemyStepMs: 3, boss: false, cameraLookAhead: 0 },
  refresh: { coyoteMs: 100, bufferMs: 120, checkpointY: 240, enemyStepMs: 5, boss: true, cameraLookAhead: 90 },
} satisfies Record<RouteMode, { coyoteMs: number; bufferMs: number; checkpointY: number; enemyStepMs: number; boss: boolean; cameraLookAhead: number }>;
