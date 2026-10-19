import { levelContent } from './content';
import { CORGI_WIDTH, CORGI_HEIGHT, spawnEnemies, type EnemyState } from './enemies';
import { MODE_CONFIG, REFRESH_WALL_JUMP } from './modeConfig';
import type { LegacyCampaign, LegacyPlatform, RouteMode } from './types';

export type RuntimeStatus = 'playing' | 'game-over' | 'finished';
export type ActionName = 'left' | 'right' | 'jump';
export interface RuntimeEvent {
  type: 'checkpoint' | 'respawn' | 'level-changed' | 'game-over' | 'finished' | 'boss-hit' | 'boss-defeated' | 'landing' | 'stomp';
  x?: number; y?: number; strength?: number; checkpointOrdinal?: number;
  levelIndex?: number; lives?: number; bossLives?: number;
}
export interface DynamicPlatform extends LegacyPlatform {
  baseX: number; baseY: number; currentX: number; currentY: number;
  movementCounter: number; movingPositive: boolean;
}
export interface BossState { active: boolean; x: number; y: number; missileX: number; missileY: number; projectileActive: boolean; hitCooldown: number }
export interface RuntimeSnapshot {
  mode: RouteMode; status: RuntimeStatus; levelIndex: number; lives: number;
  xPos: number; yPos: number; yVel: number; pVel: number; inAir: boolean;
  onLeftWall: boolean; onRightWall: boolean; leftPressed: boolean; rightPressed: boolean;
  checkpointXPic: number; checkpointYPic: number; checkpointOrdinal: number; bossLives: number; elapsedMs: number; deathMs: number;
}
export interface RuntimeDebugState {
  snapshot: RuntimeSnapshot; playerWorldX: number; playerWorldY: number;
  checkpointX: number; checkpointY: number; status: RuntimeStatus;
}
export interface RuntimeDebugController {
  warpTo: (xPos: number, yPos: number) => void;
  setCheckpoint: (x: number, y: number) => void;
  setLevel: (index: number) => void;
}

const WIDTH = 35;
const HEIGHT = 50;
const overlaps = (ax: number, ay: number, aw: number, ah: number, bx: number, by: number, bw: number, bh: number) =>
  ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;

export class PierreRuntime {
  private readonly config;
  private readonly events: RuntimeEvent[] = [];
  private levelIndex = 0;
  private status: RuntimeStatus = 'playing';
  private paused = false;
  private x = 415;
  private y = 50;
  private vx = 0;
  private vy = 1;
  private lives = 5;
  private bossLives = 3;
  private grounded = false;
  private wall = 0;
  private left = false;
  private right = false;
  private jumpHeld = false;
  private jumpRequest = 0;
  private coyote = 0;
  private wallLock = 0;
  private wallGrace = 0;
  private lastWall = 0;
  private wallRise = 0;
  private checkpoint = { x: 415, y: 280, id: -1 };
  private accumulator = 0;
  private tick = 0;
  private enemyDebt = 0;
  private elapsedMs = 0;
  private deathMs = 0;
  private invulnerableMs = 0;
  private revision = 0;
  private randomSeed = 42;
  private currentPlatforms: DynamicPlatform[] = [];
  private enemies: EnemyState[] = [];
  private boss: BossState = { active: false, x: 2020, y: 190, missileX: 2020, missileY: 240, projectileActive: false, hitCooldown: 0 };
  private readonly clouds = [
    { key: 'cloud-1', x: -300, y: 60 },
    { key: 'cloud-2', x: 200, y: 200 },
    { key: 'cloud-3', x: 700, y: 120 },
  ];

  constructor(private readonly campaign: LegacyCampaign, private readonly mode: RouteMode) {
    if (!campaign.levels.length) throw new Error('A campaign must have at least one level.');
    this.config = MODE_CONFIG[mode];
    this.startNewRun();
  }

  get snapshot(): RuntimeSnapshot {
    return {
      mode: this.mode, status: this.status, levelIndex: this.levelIndex, lives: this.lives,
      xPos: this.x - 515, yPos: this.y - 50, yVel: this.vy, pVel: this.vx,
      inAir: !this.grounded, onLeftWall: this.wall === -1, onRightWall: this.wall === 1,
      leftPressed: this.left, rightPressed: this.right,
      checkpointXPic: this.checkpoint.id < 0 ? -10000 : this.checkpoint.x + 17,
      checkpointYPic: this.checkpoint.id < 0 ? -10000 : this.checkpoint.y + HEIGHT,
      checkpointOrdinal: this.checkpoint.id,
      bossLives: this.bossLives, elapsedMs: this.elapsedMs, deathMs: this.deathMs,
    };
  }
  get debugState(): RuntimeDebugState {
    return { snapshot: this.snapshot, playerWorldX: this.x, playerWorldY: this.y,
      checkpointX: this.checkpoint.x - 515, checkpointY: this.checkpoint.y - 50, status: this.status };
  }
  get debugController(): RuntimeDebugController {
    return {
      warpTo: (x, y) => {
        this.x = x + 515; this.y = y + 50; this.vx = this.vy = 0; this.clearInput(); this.grounded = false;
        if (this.mode === 'refresh') this.wallLock = this.wallRise = 0;
      },
      setCheckpoint: (x, y) => { this.checkpoint = { x: x + 515, y: y + 50, id: 0 }; },
      setLevel: index => this.selectLevel(index),
    };
  }
  get platforms() { return this.currentPlatforms; }
  get enemyState() { return this.enemies; }
  get cloudState() { return this.clouds; }
  get bossState() { return this.boss; }
  get isPaused() { return this.paused; }
  get levelCount() { return this.campaign.levels.length; }
  getPlayerWorldPosition() { return { x: this.x, y: this.y }; }
  consumeEvents() { return this.events.splice(0); }

  startNewRun(): void {
    this.levelIndex = 0;
    this.elapsedMs = 0;
    this.randomSeed = 42;
    this.clouds.forEach((cloud, i) => { cloud.x = [-300, 200, 700][i]; cloud.y = [60, 200, 120][i]; });
    this.events.length = 0;
    this.resetLevel();
  }
  selectLevel(index: number): void {
    if (!Number.isInteger(index) || index < 0 || index >= this.campaign.levels.length) return;
    this.levelIndex = index;
    this.events.length = 0;
    this.resetLevel();
  }
  restartLevel(): void {
    this.events.length = 0;
    this.resetLevel();
  }
  private resetLevel(): void {
    this.status = 'playing';
    this.paused = false;
    this.lives = 5;
    this.bossLives = 3;
    this.elapsedMs = 0;
    this.checkpoint = { x: 415, y: this.levelIndex === 0 ? 290 : this.config.checkpointY + 50, id: -1 };
    this.resetMotion();
    this.loadCurrentLevel();
    this.invulnerableMs = 500;
    this.events.push({ type: 'level-changed', levelIndex: this.levelIndex, lives: this.lives });
  }
  private resetMotion(): void {
    this.x = this.checkpoint.x; this.y = this.checkpoint.y;
    this.vx = 0; this.vy = 0; this.grounded = false; this.wall = 0;
    this.accumulator = 0; this.tick = 0; this.enemyDebt = 0;
    this.coyote = 0; this.wallLock = 0; this.deathMs = 0;
    this.wallGrace = this.lastWall = this.wallRise = 0;
    this.clearInput();
    this.revision++;
  }
  private loadCurrentLevel(): void {
    this.currentPlatforms = levelContent(this.campaign, this.mode, this.levelIndex).platforms.map(p => ({
      ...p, baseX: p.x, baseY: p.y, currentX: p.x, currentY: p.y,
      movementCounter: p.movementOffset, movingPositive: true,
    }));
    // The old collision window snapped legacy spawns out of the floor by up to 10px.
    const floor = this.currentPlatforms.find(p => (p.type === 0 || p.type === 3) && this.x + WIDTH > p.currentX && this.x < p.currentX + p.width && this.y <= p.currentY && this.y + HEIGHT > p.currentY);
    if (floor) {
      this.y = floor.currentY - HEIGHT;
      if (this.checkpoint.id < 0) this.checkpoint.y = this.y;
    }
    this.enemies = spawnEnemies(this.currentPlatforms, this.mode, this.levelIndex);
    this.boss = { active: this.config.boss && this.levelIndex === 4, x: 2020, y: 190, missileX: 2020, missileY: 240, projectileActive: false, hitCooldown: 0 };
  }

  clearInput(): void {
    this.left = this.right = this.jumpHeld = false; this.jumpRequest = 0;
    if (this.mode === 'refresh') this.wall = this.wallGrace = this.lastWall = 0;
  }
  setPaused(paused: boolean): void {
    this.paused = paused;
    this.clearInput();
    this.accumulator = 0;
  }
  togglePause(): boolean {
    if (this.status !== 'playing') return false;
    this.setPaused(!this.paused); return this.paused;
  }
  setAction(action: ActionName, pressed: boolean): void {
    if (this.status !== 'playing' || this.paused || this.deathMs > 0) return;
    if (action === 'left') { this.left = pressed; return; }
    if (action === 'right') { this.right = pressed; return; }
    if (pressed && !this.jumpHeld) {
      this.jumpHeld = true;
      this.jumpRequest = Math.max(5, this.config.bufferMs);
      this.tryJump();
    } else if (!pressed && this.jumpHeld) {
      this.jumpHeld = false;
      if (this.vy < 0 && this.wallRise === 0) this.vy = this.mode === 'original' ? 0 : this.vy * 0.45;
    }
  }
  private tryJump(): void {
    if (!this.jumpRequest) return;
    if (this.grounded || this.coyote > 0) {
      this.vy = -15; this.grounded = false; this.coyote = 0; this.jumpRequest = 0;
    } else if (this.wall !== 0 || (this.mode === 'refresh' && this.wallGrace > 0)) {
      const side = this.wall || this.lastWall;
      this.vx = -side * (this.mode === 'refresh' ? REFRESH_WALL_JUMP.kickSpeed : 16);
      this.vy = -15; this.wall = 0;
      this.wallLock = this.mode === 'refresh' ? REFRESH_WALL_JUMP.steerLockMs : 100;
      this.wallRise = this.mode === 'refresh' ? REFRESH_WALL_JUMP.minimumRiseMs : 0;
      this.wallGrace = this.lastWall = 0;
      this.grounded = false; this.coyote = 0; this.jumpRequest = 0;
    }
  }

  update(deltaMs: number): void {
    if (this.paused || this.status !== 'playing' || !Number.isFinite(deltaMs) || deltaMs <= 0) return;
    this.accumulator += Math.min(deltaMs, 100);
    while (this.accumulator >= 5 && this.status === 'playing') {
      this.accumulator -= 5;
      const revision = this.revision;
      if (this.deathMs > 0) {
        this.deathMs = Math.max(0, this.deathMs - 5);
        if (this.deathMs === 0) this.completeRespawn();
      } else {
        this.step();
      }
      if (this.revision !== revision) break;
    }
  }
  private step(): void {
    this.tick++;
    this.elapsedMs += 5;
    this.invulnerableMs = Math.max(0, this.invulnerableMs - 5);
    this.wallLock = Math.max(0, this.wallLock - 5);
    this.wallGrace = Math.max(0, this.wallGrace - 5);
    this.wallRise = Math.max(0, this.wallRise - 5);
    this.coyote = this.grounded ? this.config.coyoteMs : Math.max(0, this.coyote - 5);
    if (this.tick % 2 === 0) this.movePlatforms();
    this.enemyDebt += 5;
    while (this.enemyDebt >= this.config.enemyStepMs) {
      this.enemyDebt -= this.config.enemyStepMs;
      for (const enemy of this.enemies) {
        if (!enemy.alive) continue;
        if (enemy.x >= enemy.maxX) enemy.forward = false;
        if (enemy.x <= enemy.minX) enemy.forward = true;
        enemy.x = Math.max(enemy.minX, Math.min(enemy.maxX, enemy.x + (enemy.forward ? 1 : -1)));
      }
    }
    if (this.tick % 4 === 0) {
      const revision = this.revision;
      this.physicsStep();
      if (this.revision !== revision || this.status !== 'playing' || this.deathMs > 0) return;
    }
    this.tryJump();
    this.jumpRequest = Math.max(0, this.jumpRequest - 5);
    if (this.checkSensors()) return;
    this.updateBoss();
    if (this.tick % 20 === 0) {
      for (const cloud of this.clouds) {
        cloud.x++;
        if (cloud.x > 1800) { cloud.x = -400; cloud.y = 40 + this.random() * 260; }
      }
    }
  }
  private random(): number {
    this.randomSeed = (1664525 * this.randomSeed + 1013904223) >>> 0;
    return this.randomSeed / 4294967296;
  }
  private movePlatforms(): void {
    for (const p of this.currentPlatforms) {
      if (p.type !== 3 && p.type !== 6) continue;
      const beforeX = p.currentX, beforeY = p.currentY;
      const standing = this.grounded && Math.abs(this.y + HEIGHT - p.currentY) < 2 && this.x + WIDTH > p.currentX && this.x < p.currentX + p.width;
      if (p.movementCounter >= p.movementRange) p.movingPositive = false;
      if (p.movementCounter <= 0) p.movingPositive = true;
      p.movementCounter += p.movingPositive ? 1 : -1;
      if (p.type === 3) p.currentX += p.movingPositive ? 1 : -1;
      else p.currentY += p.movingPositive ? 1 : -1;
      if (standing && p.type === 3) { this.x += p.currentX - beforeX; this.y += p.currentY - beforeY; }
    }
  }
  private physicsStep(): void {
    this.tryJump();
    const wasGrounded = this.grounded;
    const oldX = this.x, oldY = this.y;
    const solids = this.currentPlatforms.filter(p => p.type === 0 || p.type === 1 || p.type === 3);
    this.wall = 0;
    this.x += this.vx;
    for (const p of solids) {
      if (!overlaps(this.x, this.y, WIDTH, HEIGHT - 0.5, p.currentX, p.currentY, p.width, p.height)) continue;
      if (this.vx > 0 && oldX + WIDTH <= p.currentX + 1) {
        this.x = p.currentX - WIDTH; this.vx = 0; this.wall = 1;
      } else if (this.vx < 0 && oldX >= p.currentX + p.width - 1) {
        this.x = p.currentX + p.width; this.vx = 0; this.wall = -1;
      }
    }
    if (!this.wallLock) {
      const target = this.left ? -10 : this.right ? 10 : 0;
      this.vx += Math.sign(target - this.vx) * Math.min(1, Math.abs(target - this.vx));
    } else if (Math.abs(this.vx) > 10) this.vx -= Math.sign(this.vx);
    this.vy = Math.min(this.vy + 1, 15);
    const impactSpeed = this.vy;
    this.y += this.vy;
    this.grounded = false;
    for (const p of solids) {
      if (!(this.x + WIDTH > p.currentX && this.x < p.currentX + p.width)) continue;
      if (this.vy >= 0 && oldY + HEIGHT <= p.currentY + 1 && this.y + HEIGHT >= p.currentY) {
        this.y = p.currentY - HEIGHT;
        if (p.type === 1) { this.vy = -15; }
        else { this.vy = 0; this.grounded = true; }
      } else if (this.vy < 0 && oldY >= p.currentY + p.height - 1 && this.y < p.currentY + p.height) {
        this.y = p.currentY + p.height; this.vy = 0;
      }
    }
    // Refresh can catch a wall without holding into it; Original still requires direction input.
    if (!this.grounded) for (const p of solids) {
      if (this.y + HEIGHT <= p.currentY || this.y >= p.currentY + p.height) continue;
      const tolerance = this.mode === 'refresh' ? REFRESH_WALL_JUMP.contactTolerance : 1;
      if ((this.right || this.mode === 'refresh') && Math.abs(this.x + WIDTH - p.currentX) < tolerance) this.wall = 1;
      if ((this.left || this.mode === 'refresh') && Math.abs(this.x - p.currentX - p.width) < tolerance) this.wall = -1;
    }
    if (this.grounded) this.wall = 0;
    if (this.mode === 'refresh') {
      if (this.grounded) this.wallGrace = this.lastWall = this.wallRise = 0;
      else if (this.wall && this.wallLock === 0) {
        this.lastWall = this.wall; this.wallGrace = REFRESH_WALL_JUMP.graceMs;
        this.vy = Math.min(this.vy, REFRESH_WALL_JUMP.slideSpeed);
      }
    }
    for (const enemy of this.enemies) {
      if (!enemy.alive || !overlaps(this.x, this.y, WIDTH, HEIGHT, enemy.x, enemy.y, CORGI_WIDTH, CORGI_HEIGHT)) continue;
      if (this.vy >= 0 && oldY + HEIGHT <= enemy.y + 12) {
        enemy.alive = false; this.vy = -20;
        if (this.mode === 'refresh') this.events.push({ type: 'stomp', x: enemy.x + CORGI_WIDTH / 2, y: enemy.y });
      } else if (this.damage()) return;
    }
    if (this.mode === 'refresh' && this.grounded && !wasGrounded && impactSpeed >= 5)
      this.events.push({ type: 'landing', x: this.x + WIDTH / 2, y: this.y + HEIGHT, strength: impactSpeed / 15 });
    if (this.y > Math.max(...this.currentPlatforms.map(p => p.baseY)) + 1400) this.damage(true);
  }
  private checkSensors(): boolean {
    for (const p of this.currentPlatforms) {
      if (p.type === 0 || p.type === 1 || p.type === 3) continue;
      const contactPadding = p.type === 2 || p.type === 4 ? 1 : 0;
      if (!overlaps(this.x, this.y, WIDTH, HEIGHT, p.currentX, p.currentY - contactPadding, p.width, p.height + contactPadding + 1)) continue;
      if (p.type === 5 || p.type === 6) return this.damage(true);
      if (p.type === 4 && p.ordinal !== this.checkpoint.id) {
        const x = this.mode === 'original' ? this.x : p.currentX - 20;
        this.checkpoint = { x, y: Math.min(this.y, p.currentY + p.height - HEIGHT), id: p.ordinal };
        this.events.push({ type: 'checkpoint', levelIndex: this.levelIndex, checkpointOrdinal: p.ordinal });
      }
      if (p.type === 2) {
        if (this.levelIndex === 4 && this.config.boss && this.bossLives > 0) continue;
        if (this.levelIndex < this.campaign.levels.length - 1) {
          this.levelIndex++; this.resetLevel();
        } else {
          this.status = 'finished'; this.clearInput(); this.revision++;
          this.events.push({ type: 'finished', levelIndex: this.levelIndex });
        }
        return true;
      }
    }
    return false;
  }
  private damage(ignoreImmunity = false): boolean {
    if (this.deathMs > 0 || this.status !== 'playing' || (!ignoreImmunity && this.invulnerableMs > 0)) return false;
    this.lives--;
    this.clearInput(); this.vx = this.vy = 0;
    this.revision++;
    if (this.lives <= 0) {
      this.status = 'game-over';
      this.events.push({ type: 'game-over', levelIndex: this.levelIndex, lives: 0 });
    } else {
      this.deathMs = 360;
      this.events.push({ type: 'respawn', levelIndex: this.levelIndex, lives: this.lives });
    }
    return true;
  }
  private completeRespawn(): void {
    const lives = this.lives;
    this.resetMotion(); this.loadCurrentLevel();
    this.elapsedMs = 0;
    this.bossLives = 3; this.lives = lives; this.invulnerableMs = 700;
  }
  private updateBoss(): void {
    if (!this.boss.active || this.deathMs > 0) return;
    const boss = this.boss;
    boss.hitCooldown = Math.max(0, boss.hitCooldown - 5);
    boss.y = 175 + Math.sin(this.elapsedMs / 900) * 65;
    if (!boss.projectileActive && this.elapsedMs % 1500 === 0) {
      boss.projectileActive = true; boss.missileX = boss.x; boss.missileY = Math.min(310, boss.y + 35);
    }
    if (boss.projectileActive) {
      boss.missileX -= 1.8;
      if (boss.missileX < 300) boss.projectileActive = false;
      if (overlaps(this.x, this.y, WIDTH, HEIGHT, boss.missileX, boss.missileY, 20, 20)) {
        if (this.damage()) return;
      }
    }
    if (overlaps(this.x, this.y, WIDTH, HEIGHT, boss.x, boss.y, 90, 65)) {
      if (this.vy >= 0 && this.y + HEIGHT < boss.y + 28 && boss.hitCooldown === 0) {
        this.bossLives--; boss.hitCooldown = 900; this.vy = -18;
        this.events.push({ type: 'boss-hit', levelIndex: this.levelIndex, bossLives: this.bossLives, x: boss.x + 45, y: boss.y });
        if (this.bossLives === 0) {
          boss.active = false; boss.projectileActive = false;
          this.events.push({ type: 'boss-defeated', levelIndex: this.levelIndex, x: boss.x + 45, y: boss.y });
        }
      } else if (!boss.hitCooldown) this.damage();
    }
  }
}
