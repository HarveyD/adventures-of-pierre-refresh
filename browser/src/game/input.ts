import type { ActionName } from './runtime';
import type { RouteMode } from './types';

export class HeldInputs {
  private readonly held = new Map<string, ActionName>();
  constructor(private readonly emit: (action: ActionName, pressed: boolean) => void) {}
  set(source: string, action: ActionName, pressed: boolean): void {
    const wasDown = [...this.held.values()].includes(action);
    if (pressed) this.held.set(source, action); else this.held.delete(source);
    const isDown = [...this.held.values()].includes(action);
    if (wasDown !== isDown) this.emit(action, isDown);
  }
  release(source: string): void {
    const action = this.held.get(source);
    if (action) this.set(source, action, false);
  }
  clear(): void {
    const actions = new Set(this.held.values());
    this.held.clear();
    for (const action of actions) this.emit(action, false);
  }
}
export const actionForKey = (code: string, mode: RouteMode, bindings: Record<ActionName, string>): ActionName | null => {
  for (const action of ['left', 'right', 'jump'] as ActionName[]) if (bindings[action] === code) return action;
  if (mode === 'refresh') {
    if (code === 'ArrowLeft') return 'left';
    if (code === 'ArrowRight') return 'right';
    if (code === 'ArrowUp' || code === 'KeyW') return 'jump';
  }
  return null;
};
