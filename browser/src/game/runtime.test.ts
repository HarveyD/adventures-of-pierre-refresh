import { readFileSync } from 'node:fs';
import { describe, it, expect } from 'vitest';
import { PierreRuntime } from './runtime';
import { parseLegacyLevels } from './levelParser';
import { levelContent } from './content';
import { CORGI_WIDTH, CORGI_HEIGHT, spawnEnemies } from './enemies';
import { REFRESH_WALL_JUMP } from './modeConfig';
import type { LegacyCampaign } from './types';
import firstLevelReplay from './refresh-first-level.replay.json';
import secondLevelReplay from './refresh-second-level.replay.json';
import finalLevelReplay from './refresh-final-level.replay.json';
import fourthLevelReplay from './refresh-fourth-level.replay.json';
import thirdLevelReplay from './refresh-third-level.replay.json';
import originalFirstReplay from './original-first-level.replay.json';
import originalSecondReplay from './original-second-level.replay.json';
import originalFourthReplay from './original-fourth-level.replay.json';
import originalFinalReplay from './original-final-level.replay.json';
import originalThirdReplay from './original-third-level.replay.json';
const campaign = parseLegacyLevels(readFileSync(new URL('../../public/assets/original/data/Levels2.txt', import.meta.url), 'utf8'));
const advance = (runtime: PierreRuntime, ms: number) => { for (let time = 0; time < ms; time += 5) runtime.update(5); };
const room: LegacyCampaign = { headerBackground: null, levels: [{ index: 0, platformCount: 1, platforms: [
  { ordinal: 1, label: 'floor', x: 200, y: 340, width: 2000, height: 100, type: 0, movementRange: 0, movementOffset: 0 },
] }] };
describe('run lifecycle', () => {
  it.each(['original', 'refresh'] as const)('opens a new %s run on the first platform, including after another chapter', mode => {
    const runtime = new PierreRuntime(campaign, mode);
    const expectOpening = () => {
      expect(runtime.snapshot).toMatchObject({ levelIndex: 0, lives: 5, status: 'playing' });
      expect(runtime.getPlayerWorldPosition()).toEqual({ x: 415, y: 290 });
      advance(runtime, 20);
      expect(runtime.snapshot.inAir).toBe(false);
    };
    expectOpening();
    runtime.selectLevel(3); runtime.startNewRun(); expectOpening();
    runtime.restartLevel(); expectOpening();
  });
  it('consumes one life per death and recovers after fifth death', () => {
    const runtime = new PierreRuntime(campaign, 'refresh');
    for (let death = 0; death < 5; death++) {
      runtime.debugController.warpTo(0, 500); runtime.update(5);
      expect(runtime.snapshot.lives).toBe(4 - death);
      if (death < 4) advance(runtime, 365);
    }
    expect(runtime.snapshot.status).toBe('game-over');
    runtime.restartLevel();
    expect(runtime.snapshot).toMatchObject({ status: 'playing', lives: 5, bossLives: 3 });
    runtime.setAction('right', true); advance(runtime, 100);
    expect(runtime.snapshot.xPos).toBeGreaterThan(-100);
  });
  it('freezes on pause and rejects inputs until resumed', () => {
    const runtime = new PierreRuntime(room, 'refresh');
    runtime.setAction('right', true); advance(runtime, 100);
    runtime.setPaused(true); const before = runtime.snapshot;
    runtime.setAction('jump', true); advance(runtime, 1000);
    expect(runtime.snapshot).toEqual(before);
    runtime.setPaused(false); expect(runtime.snapshot.rightPressed).toBe(false);
  });
  it('restores a checkpoint with fresh platform and entity state', () => {
    const runtime = new PierreRuntime(campaign, 'refresh');
    runtime.debugController.warpTo(630, 240); runtime.update(5);
    const checkpoint = runtime.debugState.checkpointX;
    expect(checkpoint).not.toBe(-100);
    runtime.debugController.warpTo(0, 500); runtime.update(5);
    expect(runtime.snapshot.lives).toBe(4);
    advance(runtime, 365);
    expect(runtime.snapshot.xPos).toBe(checkpoint);
    expect(runtime.snapshot.lives).toBe(4);
  });
  it('restarts terminal completion with fresh clocks and lives', () => {
    const runtime = new PierreRuntime(campaign, 'original');
    runtime.selectLevel(4); runtime.debugController.warpTo(985, 250); runtime.update(10);
    expect(runtime.snapshot.status).toBe('finished');
    runtime.startNewRun();
    expect(runtime.snapshot).toMatchObject({ status: 'playing', levelIndex: 0, lives: 5, elapsedMs: 0 });
  });
});
describe('simulation', () => {
  it.each([firstLevelReplay, secondLevelReplay, thirdLevelReplay, fourthLevelReplay, finalLevelReplay, originalFirstReplay, originalSecondReplay, originalThirdReplay, originalFourthReplay, originalFinalReplay])('completes $mode chapter $level from spawn with only movement and jump inputs', (replay) => {
    const runtime = new PierreRuntime(campaign, replay.mode as 'original' | 'refresh');
    runtime.selectLevel(replay.level);
    for (const action of replay.actions) {
      runtime.setAction('left', action.dir === -1); runtime.setAction('right', action.dir === 1);
      runtime.setAction('jump', action.jump);
      for (let step = 0; step < 8; step++) runtime.update(5);
    }
    if (replay.level === 4) {
      expect(runtime.snapshot.status).toBe('finished');
      if (replay.mode === 'refresh') expect(runtime.snapshot.bossLives).toBe(0);
    } else expect(runtime.snapshot.levelIndex).toBe(replay.level + 1);
    expect(runtime.snapshot.lives).toBe(5);
  });
  it.each([
    { mode: 'original' as const, replays: [originalFirstReplay, originalSecondReplay, originalThirdReplay, originalFourthReplay, originalFinalReplay] },
    { mode: 'refresh' as const, replays: [firstLevelReplay, secondLevelReplay, thirdLevelReplay, fourthLevelReplay, finalLevelReplay] },
  ])('completes the whole $mode campaign without warps, level selection, damage or state injection', ({ mode, replays }) => {
    const runtime = new PierreRuntime(campaign, mode);
    for (const replay of replays) {
      expect(runtime.snapshot.levelIndex).toBe(replay.level);
      chapter: for (const action of replay.actions) {
        runtime.setAction('left', action.dir === -1); runtime.setAction('right', action.dir === 1);
        runtime.setAction('jump', action.jump);
        for (let step = 0; step < 8; step++) {
          runtime.update(5);
          expect(runtime.snapshot.lives).toBe(5);
          if (runtime.snapshot.levelIndex !== replay.level || runtime.snapshot.status === 'finished') break chapter;
        }
      }
    }
    expect(runtime.snapshot.status).toBe('finished');
    if (mode === 'refresh') expect(runtime.snapshot.bossLives).toBe(0);
  });
  it('gives the same outcome with different render frame chunking', () => {
    const a = new PierreRuntime(room, 'refresh'), b = new PierreRuntime(room, 'refresh');
    a.setAction('right', true); b.setAction('right', true);
    for (let i = 0; i < 40; i++) a.update(20);
    for (let i = 0; i < 8; i++) { b.update(33); b.update(17); b.update(50); }
    expect(a.snapshot).toEqual(b.snapshot);
    expect(a.cloudState).toEqual(b.cloudState);
  });
  it('bounds catch-up and ignores invalid deltas', () => {
    const runtime = new PierreRuntime(room, 'refresh');
    runtime.update(5000); expect(runtime.snapshot.elapsedMs).toBe(100);
    const before = runtime.snapshot; runtime.update(NaN); runtime.update(-20);
    expect(runtime.snapshot).toEqual(before);
  });
  it('lands, jumps and cuts a legacy jump on release', () => {
    const runtime = new PierreRuntime(room, 'original');
    advance(runtime, 500); expect(runtime.snapshot.inAir).toBe(false);
    runtime.setAction('jump', true); advance(runtime, 40); expect(runtime.snapshot.yVel).toBeLessThan(0);
    runtime.setAction('jump', false); expect(runtime.snapshot.yVel).toBe(0);
  });
  it('carries a standing player on moving platforms', () => {
    const moving = structuredClone(room);
    moving.levels[0].platforms[0].type = 3; moving.levels[0].platforms[0].movementRange = 200;
    const runtime = new PierreRuntime(moving, 'refresh');
    advance(runtime, 200); const x = runtime.snapshot.xPos;
    advance(runtime, 100); expect(runtime.snapshot.xPos).toBeGreaterThan(x);
  });
  it('jumps upward from the ground beside an obstacle without a wall kick', () => {
    const obstacles = structuredClone(room);
    obstacles.levels[0].platforms.push({ ...obstacles.levels[0].platforms[0], ordinal: 2, x: 500, y: 265, width: 100, height: 75 });
    const runtime = new PierreRuntime(obstacles, 'refresh');
    advance(runtime, 200); runtime.setAction('right', true); advance(runtime, 300);
    expect(runtime.snapshot.inAir).toBe(false);
    expect(runtime.snapshot.onRightWall).toBe(false);
    runtime.setAction('jump', true);
    expect(runtime.snapshot.pVel).toBeGreaterThanOrEqual(0);
    expect(runtime.snapshot.yVel).toBe(-15);
  });
  it('gives Refresh a short coyote window after leaving a ledge', () => {
    const ledge = structuredClone(room); ledge.levels[0].platforms[0].width = 300;
    const runtime = new PierreRuntime(ledge, 'refresh');
    advance(runtime, 200); runtime.setAction('right', true);
    for (let i = 0; i < 100 && !runtime.snapshot.inAir; i++) advance(runtime, 20);
    expect(runtime.snapshot.inAir).toBe(true);
    runtime.setAction('jump', true); expect(runtime.snapshot.yVel).toBe(-15);
  });
  it('buffers a Refresh jump shortly before landing', () => {
    const runtime = new PierreRuntime(room, 'refresh');
    runtime.debugController.warpTo(-100, 100);
    while (runtime.debugState.playerWorldY < 260) advance(runtime, 20);
    runtime.setAction('jump', true); advance(runtime, 80);
    expect(runtime.snapshot.yVel).toBeLessThan(0);
  });
  it('does not shorten a trampoline impulse when jump was never held', () => {
    const trampoline = structuredClone(room); trampoline.levels[0].platforms[0].type = 1;
    const runtime = new PierreRuntime(trampoline, 'original');
    for (let i = 0; i < 100 && runtime.snapshot.yVel >= 0; i++) advance(runtime, 20);
    const before = runtime.snapshot.yVel;
    expect(before).toBeLessThan(0);
    runtime.setAction('jump', false); expect(runtime.snapshot.yVel).toBe(before);
  });
  it('does not alter archived level geometry when preparing Refresh content', () => {
    const original = JSON.stringify(campaign);
    expect(levelContent(campaign, 'refresh', 4).platforms).toHaveLength(10);
    expect(JSON.stringify(campaign)).toBe(original);
  });
  it('activates the maze finish when feet touch its Java-truncated top edge', () => {
    const runtime = new PierreRuntime(campaign, 'refresh'); runtime.selectLevel(2);
    const finish = runtime.platforms.find(p => p.type === 2)!;
    runtime.debugController.warpTo(finish.currentX - 515, finish.currentY - 100);
    runtime.update(5); expect(runtime.snapshot.levelIndex).toBe(3);
  });
  it.each(['original', 'refresh'] as const)('starts every %s chapter outside the floor', (mode) => {
    const runtime = new PierreRuntime(campaign, mode);
    for (let level = 0; level < 5; level++) {
      runtime.selectLevel(level); advance(runtime, 500);
      expect(runtime.snapshot.lives).toBe(5);
      expect(runtime.debugState.playerWorldY).toBeLessThanOrEqual(290);
    }
  });
  it('requires three boss stomps before the Refresh finish opens', () => {
    const runtime = new PierreRuntime(campaign, 'refresh');
    runtime.selectLevel(4); runtime.debugController.warpTo(1670, 240); runtime.update(5);
    expect(runtime.snapshot.status).toBe('playing'); expect(runtime.snapshot.bossLives).toBe(3);
    for (let hit = 0; hit < 3; hit++) {
      runtime.debugController.warpTo(runtime.bossState.x + 10 - 515, runtime.bossState.y - 45 - 50);
      runtime.update(5);
      expect(runtime.snapshot.bossLives).toBe(2 - hit);
      runtime.debugController.warpTo(-100, 240); advance(runtime, 1000);
    }
    expect(runtime.bossState.active).toBe(false);
    runtime.debugController.warpTo(1670, 240); runtime.update(5);
    expect(runtime.snapshot.status).toBe('finished');
  });
});

describe('Refresh wall jumping', () => {
  const wallRoom = (side: -1 | 1, mode: 'refresh' | 'original' = 'refresh') => {
    const level = structuredClone(room);
    level.levels[0].platforms.push({ ...level.levels[0].platforms[0], ordinal: 2,
      x: side === 1 ? 500 : 330, y: -1000, width: 50, height: 1340 });
    const runtime = new PierreRuntime(level, mode);
    runtime.debugController.warpTo((side === 1 ? 465 : 380) - 515, 100 - 50);
    return runtime;
  };
  it.each([-1, 1] as const)('catches the %s wall and jumps without holding a direction', side => {
    const runtime = wallRoom(side); advance(runtime, 100);
    expect(side === 1 ? runtime.snapshot.onRightWall : runtime.snapshot.onLeftWall).toBe(true);
    expect(runtime.snapshot.yVel).toBeLessThanOrEqual(REFRESH_WALL_JUMP.slideSpeed);
    runtime.setAction('jump', true);
    expect(runtime.snapshot.pVel).toBe(-side * REFRESH_WALL_JUMP.kickSpeed);
    expect(runtime.snapshot.yVel).toBe(-15);
  });
  it.each([-1, 1] as const)('allows a late jump after steering away from the %s wall', side => {
    const runtime = wallRoom(side); advance(runtime, 20);
    runtime.setAction(side === 1 ? 'left' : 'right', true); advance(runtime, 80);
    expect(runtime.snapshot.onLeftWall || runtime.snapshot.onRightWall).toBe(false);
    runtime.setAction('jump', true);
    expect(runtime.snapshot.yVel).toBe(-15);
    expect(runtime.snapshot.pVel).toBe(-side * REFRESH_WALL_JUMP.kickSpeed);
  });
  it('expires wall grace and cannot reuse a consumed contact for a midair double jump', () => {
    const runtime = wallRoom(1); advance(runtime, 20);
    runtime.setAction('left', true); advance(runtime, 240);
    runtime.setAction('jump', true); expect(runtime.snapshot.yVel).toBeGreaterThanOrEqual(0);
    const jumping = wallRoom(1); advance(jumping, 20); jumping.setAction('jump', true);
    jumping.setAction('jump', false); advance(jumping, 40);
    const before = jumping.snapshot.yVel; jumping.setAction('jump', true);
    expect(jumping.snapshot.yVel).toBe(before);
  });
  it('buffers jump shortly before touching a wall', () => {
    const runtime = wallRoom(1); runtime.debugController.warpTo(440 - 515, 100 - 50);
    runtime.setAction('right', true); advance(runtime, 100);
    expect(runtime.snapshot.onRightWall).toBe(false);
    runtime.setAction('jump', true); advance(runtime, 100);
    expect(runtime.snapshot.yVel).toBeLessThan(0); expect(runtime.snapshot.pVel).toBeLessThan(0);
  });
  it('protects the upward boost on a short tap without changing normal jump release', () => {
    const runtime = wallRoom(1); advance(runtime, 20); runtime.setAction('jump', true);
    runtime.setAction('jump', false); expect(runtime.snapshot.yVel).toBe(-15);
    advance(runtime, 100); expect(runtime.snapshot.yVel).toBeLessThanOrEqual(-10);
    const normal = new PierreRuntime(room, 'refresh'); advance(normal, 20);
    normal.setAction('jump', true); normal.setAction('jump', false);
    expect(normal.snapshot.yVel).toBe(-6.75);
  });
  it('hands steering back quickly and permits repeated jumps after genuine recontact', () => {
    const runtime = wallRoom(1); advance(runtime, 20);
    const startY = runtime.getPlayerWorldPosition().y;
    for (let jump = 0; jump < 3; jump++) {
      runtime.setAction('right', true); runtime.setAction('jump', true); runtime.setAction('jump', false);
      expect(runtime.snapshot.yVel).toBe(-15);
      advance(runtime, 80); expect(runtime.snapshot.pVel).toBeGreaterThan(-REFRESH_WALL_JUMP.kickSpeed);
      for (let tick = 0; tick < 100 && !runtime.snapshot.onRightWall; tick++) advance(runtime, 5);
      expect(runtime.snapshot.onRightWall).toBe(true);
    }
    expect(runtime.getPlayerWorldPosition().y).toBeLessThan(startY - 200);
  });
  it('does not auto-jump repeatedly while jump is held', () => {
    const runtime = wallRoom(1); advance(runtime, 20);
    runtime.setAction('right', true); runtime.setAction('jump', true); advance(runtime, 700);
    expect(runtime.snapshot.onRightWall).toBe(true); expect(runtime.snapshot.yVel).toBeGreaterThanOrEqual(0);
  });
  it('keeps wall-jump results identical across render frame chunking', () => {
    const a = wallRoom(1), b = wallRoom(1);
    for (const runtime of [a, b]) {
      advance(runtime, 100); runtime.setAction('right', true); runtime.setAction('jump', true); runtime.setAction('jump', false);
    }
    for (let frame = 0; frame < 5; frame++) {
      for (let step = 0; step < 5; step++) a.update(20);
      b.update(33); b.update(17); b.update(50);
    }
    expect(a.snapshot).toEqual(b.snapshot);
  });
  it('clears contact grace on pause, warp, restart and death', () => {
    const runtime = wallRoom(1); advance(runtime, 20);
    runtime.setAction('left', true); advance(runtime, 80);
    runtime.setPaused(true); runtime.setPaused(false); runtime.setAction('jump', true);
    expect(runtime.snapshot.yVel).toBeGreaterThanOrEqual(0);
    runtime.debugController.warpTo(0, 50); runtime.setAction('jump', true);
    expect(runtime.snapshot.yVel).toBe(0);
    runtime.restartLevel(); expect(runtime.snapshot.pVel).toBe(0);
    runtime.debugController.warpTo(0, 3000); advance(runtime, 20); advance(runtime, 400);
    expect(runtime.snapshot.lives).toBe(4); expect(runtime.snapshot.pVel).toBe(0);
  });
  it('preserves Original direction requirements, kick speed and tap release', () => {
    const runtime = wallRoom(1, 'original'); advance(runtime, 20);
    expect(runtime.snapshot.onRightWall).toBe(false);
    runtime.setAction('right', true); advance(runtime, 20); runtime.setAction('jump', true);
    expect(runtime.snapshot).toMatchObject({ pVel: -16, yVel: -15 });
    runtime.setAction('jump', false); expect(runtime.snapshot.yVel).toBe(0);
  });
});

describe('impact events', () => {
  it.each(['original', 'refresh'] as const)('emits landing feedback once per real impact in %s', mode => {
    const runtime = new PierreRuntime(room, mode);
    runtime.consumeEvents();
    advance(runtime, 100); expect(runtime.consumeEvents()).toEqual([]);
    runtime.debugController.warpTo(-100, 100); advance(runtime, 600);
    const landings = runtime.consumeEvents().filter(event => event.type === 'landing');
    expect(landings).toHaveLength(mode === 'refresh' ? 1 : 0);
    if (mode === 'refresh') expect(landings[0]).toMatchObject({ x: 432.5, y: 340 });
    advance(runtime, 1000); expect(runtime.consumeEvents()).toEqual([]);
  });
  it('emits a checkpoint cue only on activation, not every sensor tick', () => {
    const runtime = new PierreRuntime(campaign, 'refresh'); runtime.consumeEvents();
    runtime.debugController.warpTo(630, 240); advance(runtime, 100);
    expect(runtime.consumeEvents().filter(event => event.type === 'checkpoint')).toEqual([
      { type: 'checkpoint', levelIndex: 0, checkpointOrdinal: runtime.snapshot.checkpointOrdinal },
    ]);
    advance(runtime, 100); expect(runtime.consumeEvents().filter(event => event.type === 'checkpoint')).toEqual([]);
  });
  it('emits one stomp at the enemy position without changing bounce velocity', () => {
    const runtime = new PierreRuntime(campaign, 'refresh'); runtime.consumeEvents();
    const enemy = runtime.enemyState[0];
    runtime.debugController.warpTo(enemy.x + 15 - 515, enemy.y - 55 - 50);
    for (let tick = 0; tick < 100 && enemy.alive; tick++) advance(runtime, 5);
    expect(enemy.alive).toBe(false); expect(runtime.snapshot.yVel).toBe(-20);
    expect(runtime.consumeEvents().filter(event => event.type === 'stomp')).toEqual([{ type: 'stomp', x: enemy.x + 25, y: enemy.y }]);
    advance(runtime, 50); expect(runtime.consumeEvents().filter(event => event.type === 'stomp')).toEqual([]);
  });
});

describe('corgi patrols', () => {
  it.each(['original', 'refresh'] as const)('keeps every %s corgi on its own clear ledge throughout repeated turns', mode => {
    const runtime = new PierreRuntime(campaign, mode);
    const counts = mode === 'original' ? [1, 2, 1, 0, 0] : [1, 2, 1, 1, 0];
    for (let level = 0; level < 5; level++) {
      runtime.selectLevel(level);
      expect(runtime.enemyState).toHaveLength(counts[level]);
      for (let tick = 0; tick < 1000; tick++) {
        advance(runtime, 20);
        for (const enemy of runtime.enemyState) {
          const support = runtime.platforms.find(p => p.ordinal === enemy.supportOrdinal)!;
          expect(Number.isFinite(enemy.minX) && Number.isFinite(enemy.maxX)).toBe(true);
          expect(enemy.x).toBeGreaterThanOrEqual(enemy.minX);
          expect(enemy.x).toBeLessThanOrEqual(enemy.maxX);
          expect(enemy.x).toBeGreaterThanOrEqual(support.currentX);
          expect(enemy.x + CORGI_WIDTH).toBeLessThanOrEqual(support.currentX + support.width);
          expect(enemy.y + CORGI_HEIGHT).toBe(support.currentY);
          for (const p of runtime.platforms) {
            if (p.type === 2 || p.type === 4) continue;
            const intersects = enemy.x < p.currentX + p.width && enemy.x + CORGI_WIDTH > p.currentX
              && enemy.y < p.currentY + p.height && enemy.y + CORGI_HEIGHT > p.currentY;
            expect(intersects, `level ${level + 1}, corgi ${enemy.id}, ${p.label}`).toBe(false);
          }
        }
      }
    }
  });
  it('omits a placement if its platform is absent, too short, or obstructed', () => {
    const floor = { ...room.levels[0].platforms[0], ordinal: 5 };
    expect(spawnEnemies([], 'refresh', 0)).toEqual([]);
    expect(spawnEnemies([{ ...floor, width: 20 }], 'refresh', 0)).toEqual([]);
    expect(spawnEnemies([floor, { ...floor, ordinal: 6, x: 1450, y: 300, width: 50 }], 'refresh', 0)).toEqual([]);
  });
  it('restores the same grounded patrol after a level reset', () => {
    const runtime = new PierreRuntime(campaign, 'refresh');
    runtime.selectLevel(1);
    const initial = structuredClone(runtime.enemyState);
    advance(runtime, 3000); runtime.restartLevel();
    expect(runtime.enemyState).toEqual(initial);
  });
});
