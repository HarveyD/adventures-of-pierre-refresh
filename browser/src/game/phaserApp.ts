import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, ORIGINAL_PLATFORM_COLORS } from './constants';
import { assetUrl, derivedUrl, legacyAssetManifest, legacyMusicByLevel, legacyUrl, media } from './legacyAssets';
import { parseLegacyLevels } from './levelParser';
import { LEVEL_NAMES, MODE_CONFIG } from './modeConfig';
import { PierreRuntime } from './runtime';
import { CORGI_WIDTH, CORGI_HEIGHT, type EnemyState } from './enemies';
import { checkpointMarkers, type CheckpointMarker } from './checkpointMarkers';
import { backgroundLayout, type BackgroundLayout } from './backgroundLayout';
import type { ActionName, RuntimeDebugController, RuntimeDebugState, RuntimeSnapshot } from './runtime';
import type { RouteMode } from './types';

export interface HudSnapshot {
  ready: boolean; loading: number; error: string | null; started: boolean;
  level: number; levelName: string; lives: number; paused: boolean;
  status: string; bossLives: number; audioAvailable: boolean;
  checkpoint: boolean;
}
export interface GameHandle {
  destroy(): void; start(): void; newRun(): void; menu(): void;
  restartLevel(): void; selectLevel(index: number): void;
  togglePause(): boolean; setPaused(paused: boolean): void;
  setAudio(muted: boolean, volume: number): void;
  setAction(action: ActionName, pressed: boolean): void;
}
declare global {
  interface Window {
    __PIERRE_DEBUG__?: { mode: RouteMode; started: boolean; hud: HudSnapshot; runtime: RuntimeDebugState | null; controller?: RuntimeDebugController; animationFrame: string | number; playerTexture: string; sceneObjects: number; enemies: EnemyState[]; checkpoints: CheckpointMarker[]; landscape: BackgroundLayout & { type: string; viewWidth: number; viewHeight: number } };
  }
}

class Music {
  private audio: HTMLAudioElement | null = null;
  private key = '';
  private muted = false;
  private volume = 0.35;
  private failed = false;
  private generation = 0;
  get available() { return !this.failed; }
  configure(muted: boolean, volume: number): void {
    this.muted = muted; this.volume = volume;
    if (this.audio) { this.audio.muted = muted; this.audio.volume = volume; }
  }
  play(key: string): void {
    if (this.key === key && this.audio) {
      if (this.audio.paused && !this.failed) void this.audio.play().catch(() => {});
      return;
    }
    this.stop();
    this.key = key;
    const generation = this.generation;
    const audio = new Audio();
    this.audio = audio;
    const ext = audio.canPlayType('audio/mpeg') ? 'mp3' : 'ogg';
    audio.src = derivedUrl(key + '.' + ext);
    audio.preload = 'none'; audio.loop = true; audio.muted = this.muted; audio.volume = this.volume;
    audio.onerror = () => {
      if (generation !== this.generation) return;
      if (audio.src.endsWith('.' + ext)) {
        audio.src = derivedUrl(key + '.' + (ext === 'mp3' ? 'ogg' : 'mp3'));
        void audio.play().catch(() => { this.failed = true; });
      } else this.failed = true;
    };
    void audio.play().then(() => { this.failed = false; }).catch(() => { /* Gameplay stays available if audio is blocked. */ });
  }
  pause(): void { this.audio?.pause(); }
  stop(): void {
    this.generation++;
    if (this.audio) { this.audio.pause(); this.audio.removeAttribute('src'); this.audio.load(); this.audio = null; }
    this.key = ''; this.failed = false;
  }
}

export const mountPierreGame = (mode: RouteMode, parent: HTMLElement, onHudUpdate: (hud: HudSnapshot) => void): GameHandle => {
  const music = new Music();
  let runtime: PierreRuntime | null = null;
  let ready = false, loading = 0, error: string | null = null, started = false;
  let lastHud = '', cameraX = 0, cameraY = 0, lastLevel = -1;
  const portrait = () => mode === 'refresh' && window.innerWidth <= 700 && window.innerHeight > window.innerWidth;
  let viewWidth = portrait() ? 640 : GAME_WIDTH;
  let viewHeight = portrait() ? 960 : GAME_HEIGHT;
  let player: Phaser.GameObjects.Sprite;
  let background: Phaser.GameObjects.Image;
  let graphics: Phaser.GameObjects.Graphics;
  const clouds: Phaser.GameObjects.Image[] = [];
  const enemies: Phaser.GameObjects.Image[] = [];
  let bossSprite: Phaser.GameObjects.Image;
  let signature: HudSnapshot;
  const emit = () => {
    const snapshot = runtime?.snapshot;
    signature = {
      ready, loading, error, started, level: (snapshot?.levelIndex ?? 0) + 1,
      levelName: LEVEL_NAMES[snapshot?.levelIndex ?? 0] ?? 'Pierre',
      lives: snapshot?.lives ?? 5, paused: runtime?.isPaused ?? false,
      status: snapshot?.status ?? 'loading', bossLives: snapshot?.bossLives ?? 3, audioAvailable: music.available,
      checkpoint: (snapshot?.checkpointXPic ?? -10000) > -9999,
    };
    const hash = JSON.stringify(signature);
    if (hash !== lastHud) { lastHud = hash; onHudUpdate(signature); }
  };
  const resumeMusic = () => {
    if (runtime && started && !runtime.isPaused && runtime.snapshot.status === 'playing')
      music.play(legacyMusicByLevel[runtime.snapshot.levelIndex]);
  };
  const resetCamera = () => { lastLevel = -1; };
  class WorldScene extends Phaser.Scene {
    constructor() { super('world'); }
    preload(): void {
      this.load.on('progress', (progress: number) => { loading = progress; emit(); });
      this.load.on('loaderror', (file: Phaser.Loader.File) => { error = 'Unable to load ' + file.key; emit(); });
      this.load.text('levels', assetUrl('assets/original/data/Levels2.txt'));
      for (const asset of legacyAssetManifest) this.load.image(asset.key, legacyUrl(asset.file));
      for (const [key, info] of Object.entries(media.animations)) {
        this.load.spritesheet(key, derivedUrl(info.file), { frameWidth: info.width, frameHeight: info.height });
      }
    }
    create(): void {
      if (error) { emit(); return; }
      try { runtime = new PierreRuntime(parseLegacyLevels(this.cache.text.get('levels')), mode); }
      catch (reason) { error = String(reason); emit(); return; }
      runtime.setPaused(true);
      for (const [key, info] of Object.entries(media.animations)) {
        this.anims.create({
          key, frames: info.durations.map((duration, frame) => ({ key, frame, duration: duration - 1 })),
          frameRate: 1000, repeat: info.loop === 0 ? -1 : Math.max(0, (info.loop ?? 1) - 1),
        });
      }
      background = this.add.image(0, 0, 'landscape').setOrigin(0);
      for (const key of ['cloud-1', 'cloud-2', 'cloud-3']) clouds.push(this.add.image(0, 0, key).setOrigin(0).setAlpha(0.75));
      graphics = this.add.graphics();
      for (let i = 0; i < 5; i++) enemies.push(this.add.image(0, 0, 'corgi-right').setOrigin(0).setCrop(0, 0, CORGI_WIDTH, CORGI_HEIGHT));
      bossSprite = this.add.image(0, 0, 'corgi-right').setOrigin(0).setCrop(0, 0, 50, 34).setScale(1.8);
      player = this.add.sprite(0, 0, 'player-idle').setOrigin(0);
      ready = true; emit();
    }
    update(_time: number, delta: number): void {
      if (!runtime || !ready) return;
      if (started) runtime.update(delta);
      for (const event of runtime.consumeEvents()) {
        if (event.type === 'level-changed') resetCamera();
        if (event.type === 'finished' || event.type === 'game-over') music.stop();
      }
      const snapshot = runtime.snapshot;
      if (!started || runtime.isPaused || snapshot.status !== 'playing') music.pause();
      else resumeMusic();
      renderWorld(this, snapshot, delta);
      emit();
      if (import.meta.env.DEV) window.__PIERRE_DEBUG__ = {
        mode, started, hud: signature, runtime: runtime.debugState, controller: runtime.debugController,
        animationFrame: player.frame.name, playerTexture: player.texture.key, sceneObjects: this.children.length,
        enemies: runtime.enemyState.map(enemy => ({ ...enemy })),
        checkpoints: checkpointMarkers(runtime.platforms, snapshot.checkpointOrdinal),
        landscape: { type: background.type, x: background.x, y: background.y, width: background.displayWidth, height: background.displayHeight, viewWidth, viewHeight },
      };
    }
  }
  const renderWorld = (_scene: Phaser.Scene, snapshot: RuntimeSnapshot, delta: number) => {
    if (!runtime) return;
    const position = runtime.getPlayerWorldPosition();
    const targetX = mode === 'original' ? snapshot.xPos - 100 : position.x - viewWidth * 0.45 + Math.max(-1, Math.min(1, snapshot.pVel / 10)) * MODE_CONFIG[mode].cameraLookAhead;
    const targetY = mode === 'original' ? snapshot.yPos - 400 : position.y - viewHeight * 0.61;
    const blend = lastLevel !== snapshot.levelIndex || mode === 'original' ? 1 : 1 - Math.exp(-delta / 150);
    cameraX += (targetX - cameraX) * blend; cameraY += (targetY - cameraY) * blend;
    lastLevel = snapshot.levelIndex;
    const landscape = backgroundLayout(background.width, background.height, viewWidth, viewHeight, cameraX, cameraY);
    background.setPosition(landscape.x, landscape.y).setDisplaySize(landscape.width, landscape.height);
    background.setTint(mode === 'original' ? 0xffffff : [0xffffff, 0xe1f6ff, 0xffe5ac, 0xd2edf9, 0x516579][snapshot.levelIndex]);
    graphics.clear();
    runtime.cloudState.forEach((cloud, index) => clouds[index].setPosition(cloud.x - (mode === 'original' ? snapshot.xPos : cameraX) / 8, cloud.y - (mode === 'original' ? snapshot.yPos / 8 : 0)));
    const colors = [0x344c3b, 0x417785, 0x6f6544, 0xd8e7ec, 0x374b55];
    for (const p of runtime.platforms) {
      const x = p.currentX - cameraX, y = p.currentY - cameraY;
      if (x + p.width < 0 || x > viewWidth || y + p.height < 0 || y > viewHeight) continue;
      const left = Math.max(-40, x), right = Math.min(viewWidth + 40, x + p.width);
      const top = Math.max(-40, y), bottom = Math.min(viewHeight + 40, y + p.height);
      if (mode === 'original') {
        graphics.fillStyle(ORIGINAL_PLATFORM_COLORS[p.type]); graphics.fillRect(left, top, right - left, bottom - top);
      } else if (p.type === 0 || p.type === 3) {
        graphics.fillStyle(colors[snapshot.levelIndex]); graphics.fillRect(left, top, right - left, bottom - top);
        graphics.fillStyle(p.type === 3 ? 0xf6a845 : snapshot.levelIndex === 3 ? 0xffffff : 0x96cf8c);
        graphics.fillRect(left, y, right - left, Math.min(6, p.height));
        graphics.lineStyle(1, 0xffffff, 0.13); graphics.strokeRect(left, top, right - left, bottom - top);
      } else if (p.type === 5 || p.type === 6) {
        graphics.fillStyle(0xc74253); graphics.fillRect(left, Math.max(top, y + 6), right - left, Math.max(0, bottom - Math.max(top, y + 6)));
        graphics.fillStyle(0xff8291);
        for (let spike = left; spike < right; spike += 14) graphics.fillTriangle(spike, y + 10, spike + 7, y, spike + 14, y + 10);
      } else if (p.type === 1) {
        graphics.fillStyle(0x165cd9); graphics.fillRect(x, y, p.width, p.height);
        graphics.fillStyle(0x91f3ff); graphics.fillRect(x, y, p.width, 6);
      }
      if (p.type === 2 && mode === 'refresh') {
        const locked = snapshot.levelIndex === 4 && snapshot.bossLives > 0;
        graphics.lineStyle(4, locked ? 0x64757b : 0xffd657);
        graphics.strokeRect(x - 10, y - 10, 40, p.height + 10);
        graphics.fillStyle(locked ? 0x64757b : 0xffd657, 0.25); graphics.fillRect(x - 10, y - 10, 40, p.height + 10);
      }
    }
    // Draw flags after terrain so later platform entries cannot cover them.
    for (const marker of checkpointMarkers(runtime.platforms, snapshot.checkpointOrdinal)) {
      const x = marker.x - cameraX, y = marker.y - cameraY;
      const height = mode === 'original' ? 90 : 78;
      if (x + 30 < 0 || x > viewWidth || y < 0 || y - height > viewHeight) continue;
      graphics.lineStyle(3, 0xffffff); graphics.lineBetween(x, y, x, y - height);
      const color = mode === 'original' ? marker.active ? 0xffff00 : 0x00ff00 : marker.active ? 0xffd657 : 0x4bce9b;
      graphics.fillStyle(color); graphics.fillTriangle(x, y - height, x + 30, y - height + 10, x, y - height + 20);
    }
    runtime.enemyState.forEach((enemy, index) => {
      enemies[index].setVisible(enemy.alive).setTexture(enemy.forward ? 'corgi-right' : 'corgi-left').setPosition(enemy.x - cameraX, enemy.y - cameraY);
    });
    if (mode === 'original') {
      graphics.fillStyle(0x000000);
      for (let life = 0; life < snapshot.lives; life++) graphics.fillRect(950 + life * 20, 20, 10, 40);
    }
    for (let index = runtime.enemyState.length; index < enemies.length; index++) enemies[index].setVisible(false);
    const boss = runtime.bossState;
    bossSprite.setVisible(boss.active).setPosition(boss.x - cameraX, boss.y - cameraY).setAlpha(boss.hitCooldown > 0 ? 0.5 : 1);
    if (boss.active) {
      graphics.fillStyle(0x273632); graphics.fillRect(boss.x - cameraX - 10, boss.y - cameraY - 20, 110, 7);
      graphics.fillStyle(0xff6a75); graphics.fillRect(boss.x - cameraX - 10, boss.y - cameraY - 20, 110 * snapshot.bossLives / 3, 7);
    }
    if (boss.projectileActive) {
      graphics.fillStyle(0xffd657); graphics.fillCircle(boss.missileX - cameraX + 10, boss.missileY - cameraY + 10, 10);
      graphics.fillStyle(0xf4734e); graphics.fillCircle(boss.missileX - cameraX + 10, boss.missileY - cameraY + 10, 5);
    }
    if (mode === 'refresh' && snapshot.levelIndex === 4 && !boss.active) {
      const x = 2180 - cameraX, y = 318 - cameraY;
      graphics.fillStyle(0xfff2cb); graphics.fillTriangle(x, y - 18, x + 30, y, x - 10, y);
      graphics.fillStyle(0xee81a4); graphics.fillRect(x - 10, y, 40, 12);
      graphics.fillStyle(0xd6425e); graphics.fillCircle(x + 7, y - 15, 4);
    }
    const key = snapshot.deathMs > 0 ? 'player-death' : snapshot.onLeftWall ? 'player-wall-left' : snapshot.onRightWall ? 'player-wall-right' :
      snapshot.leftPressed ? snapshot.yVel > 0 ? 'player-fall-left' : 'player-run-left' :
      snapshot.rightPressed ? snapshot.yVel > 0 ? 'player-fall-right' : 'player-run-right' : 'player-idle';
    player.setPosition(position.x - cameraX, position.y - cameraY);
    if (player.anims.currentAnim?.key !== key) player.play(key);
    if (runtime.isPaused || !started || snapshot.status !== 'playing') player.anims.pause();
    else player.anims.resume();
  };
  emit();
  const game = new Phaser.Game({
    type: Phaser.AUTO, parent, width: viewWidth, height: viewHeight,
    backgroundColor: '#a0cedf',
    render: { antialias: false, pixelArt: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: viewWidth, height: viewHeight },
    scene: [WorldScene],
  });
  const resize = () => {
    if (!game.isBooted) return;
    viewWidth = portrait() ? 640 : GAME_WIDTH; viewHeight = portrait() ? 960 : GAME_HEIGHT;
    game.scale.setGameSize(viewWidth, viewHeight);
    game.scale.setParentSize(parent.clientWidth, parent.clientHeight);
    resetCamera();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(parent);
  window.addEventListener('resize', resize);
  return {
    destroy: () => { observer.disconnect(); window.removeEventListener('resize', resize); music.stop(); game.destroy(true); delete window.__PIERRE_DEBUG__; },
    start: () => {
      if (!ready || !runtime) return;
      if (runtime.snapshot.status !== 'playing') runtime.restartLevel();
      started = true; runtime.setPaused(false); resumeMusic(); emit();
    },
    newRun: () => { if (!ready || !runtime) return; runtime.startNewRun(); started = true; resetCamera(); resumeMusic(); emit(); },
    menu: () => { started = false; runtime?.setPaused(true); music.stop(); emit(); },
    restartLevel: () => { if (!ready || !runtime) return; runtime.restartLevel(); started = true; resetCamera(); resumeMusic(); emit(); },
    selectLevel: index => { if (!ready || !runtime) return; runtime.selectLevel(index); started = true; resetCamera(); resumeMusic(); emit(); },
    togglePause: () => { const paused = runtime?.togglePause() ?? false; if (paused) music.pause(); else resumeMusic(); emit(); return paused; },
    setPaused: paused => { runtime?.setPaused(paused); if (paused) music.pause(); else resumeMusic(); emit(); },
    setAudio: (muted, volume) => { music.configure(muted, volume); if (!muted) resumeMusic(); },
    setAction: (action, pressed) => { if (started) runtime?.setAction(action, pressed); },
  };
};
