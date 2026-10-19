import type { RouteMode } from './types';
export interface Settings {
  version: 1; muted: boolean; volume: number; unlocked: number;
  original: Record<'left' | 'right' | 'jump', string>;
  refresh: Record<'left' | 'right' | 'jump', string>;
}
export const defaults = (): Settings => ({
  version: 1, muted: false, volume: 0.35, unlocked: 0,
  original: { left: 'Digit1', right: 'Digit3', jump: 'Space' },
  refresh: { left: 'KeyA', right: 'KeyD', jump: 'Space' },
});
export const loadSettings = (): Settings => {
  try {
    const value = JSON.parse(localStorage.getItem('pierre.settings.v1') ?? 'null');
    const result = defaults();
    if (value?.version !== 1) return result;
    result.muted = value.muted === true;
    if (typeof value.volume === 'number' && Number.isFinite(value.volume)) result.volume = Math.max(0, Math.min(1, value.volume));
    if (Number.isInteger(value.unlocked)) result.unlocked = Math.max(0, Math.min(4, value.unlocked));
    for (const mode of ['original', 'refresh'] as RouteMode[]) {
      const bindings = value[mode];
      if (bindings && ['left', 'right', 'jump'].every(key => typeof bindings[key] === 'string' && /^[A-Za-z0-9]+$/.test(bindings[key])) &&
          new Set(Object.values(bindings)).size === 3) result[mode] = bindings;
    }
    return result;
  } catch { return defaults(); }
};
export const saveSettings = (settings: Settings): void => {
  try { localStorage.setItem('pierre.settings.v1', JSON.stringify(settings)); } catch { /* Play remains available with storage disabled. */ }
};
export const keyLabel = (code: string): string => code === 'Space' ? 'Space' : code.replace(/^Key|^Digit/, '').replace('Arrow', '');
