import Phaser from 'phaser';
import { GAME_HEIGHT, GAME_WIDTH, ORIGINAL_PLATFORM_COLORS } from './constants';
import { assetUrl, derivedUrl, legacyAssetManifest, legacyMusicByLevel, legacyUrl, media } from './legacyAssets';
import { parseLegacyLevels } from './levelParser';
import { LEVEL_NAMES, MODE_CONFIG } from './modeConfig';
import { PierreRuntime } from './runtime';
import { CORGI_WIDTH, CORGI_HEIGHT, type EnemyState } from './enemies';
import { checkpointMarkers, type CheckpointMarker } from './checkpointMarkers';
import { backgroundLayout, type BackgroundLayout } from './backgroundLayout';
import { refreshBackgrounds, refreshBackgroundByLevel } from './refreshBackgrounds';
import { FeedbackAudio, FeedbackEffects, type FeedbackCue } from './feedback';
import { terrainSurfaces, type TerrainSurface } from './terrainSurfaces';
import { drawRefreshTerrain, drawRefreshTrampoline } from './terrainRenderer';
import { TERRAIN_MATERIALS, MOVING_MATERIAL } from './terrainMaterials';
import { TerrainTiles } from './terrainTiles';
import { finishMarkers, type FinishMarker } from './finishMarkers';
import { refreshSpriteAssets, refreshPlayerAnimations, REFRESH_PIERRE_SCALE, REFRESH_CORGI_SCALE, REFRESH_BOSS_SCALE } from './refreshSprites';
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
    __PIERRE_DEBUG__?: { mode: RouteMode; started: boolean; hud: HudSnapshot; runtime: RuntimeDebugState | null; controller?: RuntimeDebugController; animationFrame: string | number; playerTexture: string; playerAnimation: string; sceneObjects: number; enemies: EnemyState[]; checkpoints: CheckpointMarker[]; finishes: FinishMarker[]; surfaces: TerrainSurface[]; terrainMaterial: { name: string; colors: number[] } | null; renderScale: number; actors: { x: number; y: number; width: number; height: number; texture: string; frame: string | number; flipX: boolean }[]; landscape: BackgroundLayout & { type: string; texture: string; sourceWidth: number; sourceHeight: number; viewWidth: number; viewHeight: number }; feedback: { effects: number; audio: FeedbackAudio['status'] | null } };
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
  const sounds = mode === 'refresh' ? new FeedbackAudio() : null;
  const effects = new FeedbackEffects();
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const clearFeedback = () => { effects.clear(); sounds?.setActive(false); };
  let runtime: PierreRuntime | null = null;
  let ready = false, loading = 0, error: string | null = null, started = false;
  let lastHud = '', cameraX = 0, cameraY = 0, lastLevel = -1;
  let facingLeft = false;
  const renderScale = mode === 'refresh' ? 2 : 1;
  const portrait = () => mode === 'refresh' && window.innerWidth <= 700 && window.innerHeight > window.innerWidth;
  let viewWidth = portrait() ? 640 : GAME_WIDTH;
  let viewHeight = portrait() ? 960 : GAME_HEIGHT;
  let player: Phaser.GameObjects.Sprite;
  let background: Phaser.GameObjects.Image;
  let graphics: Phaser.GameObjects.Graphics;
  let hazardGraphics: Phaser.GameObjects.Graphics | null = null;
  let terrainTiles: TerrainTiles | null = null;
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
      if (mode === 'refresh') for (const asset of refreshBackgrounds)
        this.load.image(asset.key, assetUrl('assets/refresh/backgrounds/' + asset.file));
      if (mode === 'refresh') for (const asset of refreshSpriteAssets)
        this.load.image(asset.key, assetUrl('assets/refresh/sprites/' + asset.file));
      for (const [key, info] of Object.entries(media.animations)) {
        this.load.spritesheet(key, derivedUrl(info.file), { frameWidth: info.width, frameHeight: info.height });
      }
    }
    create(): void {
      if (error) { emit(); return; }
      try { runtime = new PierreRuntime(parseLegacyLevels(this.cache.text.get('levels')), mode); }
      catch (reason) { error = String(reason); emit(); return; }
      runtime.setPaused(true);
      this.cameras.main.setOrigin(0, 0).setZoom(renderScale);
      for (const [key, info] of Object.entries(media.animations)) {
        this.anims.create({
          key, frames: info.durations.map((duration, frame) => ({ key, frame, duration: duration - 1 })),
          frameRate: 1000, repeat: info.loop === 0 ? -1 : Math.max(0, (info.loop ?? 1) - 1),
        });
      }
      if (mode === 'refresh') {
        for (const asset of refreshSpriteAssets) asset.frames.forEach(([x, y, width, height], index) => this.textures.get(asset.key).add(index, 0, x, y, width, height));
        for (const [key, frames] of Object.entries(refreshPlayerAnimations)) this.anims.create({
          key: 'refresh-' + key, frames: frames.map(frame => ({ key: 'refresh-pierre', frame })), frameRate: 10, repeat: -1,
        });
      }
      background = this.add.image(0, 0, 'landscape').setOrigin(0);
      for (const key of ['cloud-1', 'cloud-2', 'cloud-3']) clouds.push(this.add.image(0, 0, key).setOrigin(0).setAlpha(0.75));
      if (mode === 'refresh') { hazardGraphics = this.add.graphics(); terrainTiles = new TerrainTiles(this); }
      graphics = this.add.graphics();
      for (let i = 0; i < 5; i++) {
        const enemy = this.add.image(0, 0, mode === 'refresh' ? 'refresh-corgi' : 'corgi-right', mode === 'refresh' ? 0 : undefined);
        enemies.push(mode === 'refresh' ? enemy.setOrigin(0.5, 1).setScale(REFRESH_CORGI_SCALE) : enemy.setOrigin(0).setCrop(0, 0, CORGI_WIDTH, CORGI_HEIGHT));
      }
      bossSprite = this.add.image(0, 0, mode === 'refresh' ? 'refresh-corgi' : 'corgi-right', mode === 'refresh' ? 0 : undefined);
      if (mode === 'refresh') bossSprite.setOrigin(0.5, 1).setScale(REFRESH_BOSS_SCALE);
      else bossSprite.setOrigin(0).setCrop(0, 0, 50, 34).setScale(1.8);
      player = this.add.sprite(0, 0, mode === 'refresh' ? 'refresh-pierre' : 'player-idle', 0);
      if (mode === 'refresh') player.setOrigin(0.5, 1).setScale(REFRESH_PIERRE_SCALE);
      else player.setOrigin(0);
      ready = true; emit();
    }
    update(_time: number, delta: number): void {
      if (!runtime || !ready) return;
      if (started) runtime.update(delta);
      const events = runtime.consumeEvents();
      const canFeedback = started && !runtime.isPaused && runtime.snapshot.status === 'playing' && runtime.snapshot.deathMs === 0;
      const resetFeedback = events.some(event => ['level-changed', 'respawn', 'game-over', 'finished'].includes(event.type));
      if (resetFeedback) clearFeedback();
      sounds?.setActive(canFeedback);
      if (canFeedback) effects.advance(delta);
      for (const event of events) {
        if (event.type === 'level-changed') resetCamera();
        if (event.type === 'finished' || event.type === 'game-over') music.stop();
        if (mode !== 'refresh' || !canFeedback || resetFeedback) continue;
        if (event.type === 'checkpoint') {
          const marker = checkpointMarkers(runtime.platforms, runtime.snapshot.checkpointOrdinal).find(marker => marker.ordinal === event.checkpointOrdinal);
          if (marker) effects.add('checkpoint', marker.x + 15, marker.y - 68);
          sounds?.play('checkpoint');
        } else if (['landing', 'stomp', 'boss-hit', 'boss-defeated'].includes(event.type) && event.x !== undefined && event.y !== undefined) {
          if (event.type === 'boss-hit' && event.bossLives === 0) continue;
          const cue = event.type as FeedbackCue;
          effects.add(cue, event.x, event.y, event.strength);
          sounds?.play(cue);
        }
      }
      const snapshot = runtime.snapshot;
      if (!started || runtime.isPaused || snapshot.status !== 'playing') music.pause();
      else resumeMusic();
      renderWorld(this, snapshot, delta);
      emit();
      if (import.meta.env.DEV) window.__PIERRE_DEBUG__ = {
        mode, started, hud: signature, runtime: runtime.debugState, controller: runtime.debugController,
        animationFrame: player.frame.name, playerTexture: player.texture.key, playerAnimation: player.anims.currentAnim?.key ?? '', sceneObjects: this.children.length,
        enemies: runtime.enemyState.map(enemy => ({ ...enemy })),
        checkpoints: checkpointMarkers(runtime.platforms, snapshot.checkpointOrdinal),
        finishes: finishMarkers(runtime.platforms, snapshot.levelIndex === 4 && snapshot.bossLives > 0),
        surfaces: mode === 'refresh' ? terrainSurfaces(runtime.platforms) : [], renderScale,
        terrainMaterial: mode === 'refresh' ? { name: TERRAIN_MATERIALS[snapshot.levelIndex].name, colors: [...Object.values(TERRAIN_MATERIALS[snapshot.levelIndex].colors), ...Object.values(MOVING_MATERIAL.colors)] } : null,
        actors: [player, ...enemies.filter(enemy => enemy.visible), ...(bossSprite.visible ? [bossSprite] : [])].map(actor => ({ x: actor.x, y: actor.y, width: actor.displayWidth, height: actor.displayHeight, texture: actor.texture.key, frame: actor.frame.name, flipX: actor.flipX })),
        landscape: { type: background.type, texture: background.texture.key, sourceWidth: background.width, sourceHeight: background.height, x: background.x, y: background.y, width: background.displayWidth, height: background.displayHeight, viewWidth, viewHeight },
        feedback: { effects: effects.active.length, audio: sounds?.status ?? null },
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
    const texture = mode === 'original' ? 'landscape' : refreshBackgroundByLevel[snapshot.levelIndex];
    if (background.texture.key !== texture) background.setTexture(texture);
    const landscape = backgroundLayout(background.width, background.height, viewWidth, viewHeight, cameraX, cameraY);
    background.setPosition(landscape.x, landscape.y).setDisplaySize(landscape.width, landscape.height);
    background.clearTint();
    graphics.clear();
    hazardGraphics?.clear();
    const hazardLayer = hazardGraphics ?? graphics;
    runtime.cloudState.forEach((cloud, index) => clouds[index].setVisible(mode === 'original' || snapshot.levelIndex === 0).setPosition(cloud.x - (mode === 'original' ? snapshot.xPos : cameraX) / 8, cloud.y - (mode === 'original' ? snapshot.yPos / 8 : 0)));
    for (const p of runtime.platforms) {
      const x = p.currentX - cameraX, y = p.currentY - cameraY;
      if (x + p.width < 0 || x > viewWidth || y + p.height < 0 || y > viewHeight) continue;
      const left = Math.max(-40, x), right = Math.min(viewWidth + 40, x + p.width);
      const top = Math.max(-40, y), bottom = Math.min(viewHeight + 40, y + p.height);
      if (mode === 'original') {
        graphics.fillStyle(ORIGINAL_PLATFORM_COLORS[p.type]); graphics.fillRect(left, top, right - left, bottom - top);
      } else if (p.type === 0 || p.type === 3) {
        continue;
      } else if (p.type === 5 || p.type === 6) {
        hazardLayer.fillStyle(0xc74253); hazardLayer.fillRect(left, Math.max(top, y + 6), right - left, Math.max(0, bottom - Math.max(top, y + 6)));
        hazardLayer.fillStyle(0xff8291);
        for (let spike = left; spike < right; spike += 14) hazardLayer.fillTriangle(spike, y + 10, spike + 7, y, spike + 14, y + 10);
      } else if (p.type === 1) {
        drawRefreshTrampoline(hazardLayer, x, y, p.width, p.height);
      }
    }
    if (mode === 'refresh') {
      terrainTiles?.render(runtime.platforms, snapshot.levelIndex, cameraX, cameraY, viewWidth, viewHeight);
      drawRefreshTerrain(graphics, runtime.platforms, snapshot.levelIndex, cameraX, cameraY, viewWidth, viewHeight);
    }
    // Finish graphics sit above the supporting ground, never inside the trigger box.
    if (mode === 'refresh') for (const marker of finishMarkers(runtime.platforms, snapshot.levelIndex === 4 && snapshot.bossLives > 0)) {
      const x = marker.x - cameraX, y = marker.y - cameraY;
      if (x + 45 < 0 || x - 45 > viewWidth || y < 0 || y - 106 > viewHeight) continue;
      const gold = marker.locked ? 0x9ba6b3 : 0xffd657;
      for (const side of [-1, 1]) {
        graphics.fillStyle(0x19282b); graphics.fillRect(x + side * 40 - 4, y - 104, 8, 104);
        graphics.fillStyle(gold); graphics.fillRect(x + side * 40 - 2, y - 102, 4, 102);
        graphics.fillRect(x + side * 40 - 8, y - 4, 16, 4);
      }
      graphics.fillStyle(0x19282b); graphics.fillRect(x - 44, y - 106, 88, 30);
      for (let row = 0; row < 3; row++) for (let column = 0; column < 8; column++) {
        graphics.fillStyle((row + column) % 2 ? 0x243136 : marker.locked ? 0x9ba6b3 : 0xfff8dc);
        graphics.fillRect(x - 40 + column * 10, y - 102 + row * 8, 10, 8);
      }
      if (marker.locked) {
        graphics.lineStyle(4, 0xd5dce5); graphics.strokeRoundedRect(x - 7, y - 70, 14, 18, 6);
        graphics.fillStyle(gold); graphics.fillRect(x - 12, y - 60, 24, 20);
        graphics.fillStyle(0x243136); graphics.fillCircle(x, y - 53, 3); graphics.fillRect(x - 1, y - 52, 2, 7);
      } else {
        graphics.fillStyle(0x19282b); graphics.fillCircle(x, y - 48, 16);
        graphics.fillStyle(gold); graphics.fillTriangle(x - 6, y - 57, x + 9, y - 48, x - 6, y - 39);
      }
    }
    // Draw flags after terrain so later platform entries cannot cover them.
    for (const marker of checkpointMarkers(runtime.platforms, snapshot.checkpointOrdinal)) {
      const x = marker.x - cameraX, y = marker.y - cameraY;
      const height = mode === 'original' ? 90 : 78;
      if (x + 30 < 0 || x > viewWidth || y < 0 || y - height > viewHeight) continue;
      graphics.lineStyle(3, 0xffffff); graphics.lineBetween(x, y, x, y - height);
      const color = mode === 'original' ? marker.active ? 0xffff00 : 0x00ff00 : marker.active ? 0xffd657 : 0x4bce9b;
      const flutter = mode === 'refresh' && marker.active && !reducedMotion.matches ? Math.sin(snapshot.elapsedMs / 120) * 3 : 0;
      graphics.fillStyle(color); graphics.fillTriangle(x, y - height, x + 30, y - height + 10 + flutter, x, y - height + 20);
    }
    if (mode === 'refresh') for (const effect of effects.active) {
      const x = effect.x - cameraX, y = effect.y - cameraY;
      const progress = effect.age / effect.duration, alpha = 1 - progress;
      const color = effect.cue === 'landing' ? 0xffffff : effect.cue === 'checkpoint' ? 0xffd657 : 0xffe9a1;
      if (reducedMotion.matches) {
        graphics.lineStyle(2, color, alpha * 0.7); graphics.strokeEllipse(x, y, 36, 12);
        continue;
      }
      if (effect.cue === 'landing') {
        graphics.fillStyle(color, alpha * 0.65);
        for (const direction of [-1, 1]) for (let puff = 0; puff < 3; puff++)
          graphics.fillCircle(x + direction * (8 + progress * (18 + puff * 8) * effect.strength), y - 3 - Math.sin(progress * Math.PI) * (4 + puff * 3), (4 - puff * 0.6) * alpha);
      } else {
        const radius = 12 + progress * (effect.cue === 'boss-defeated' ? 65 : 32);
        graphics.lineStyle(3 * alpha, color, alpha); graphics.strokeCircle(x, y, radius);
        for (let ray = 0; ray < 6; ray++) {
          const angle = ray * Math.PI / 3;
          graphics.lineBetween(x + Math.cos(angle) * (radius + 4), y + Math.sin(angle) * (radius + 4), x + Math.cos(angle) * (radius + 11), y + Math.sin(angle) * (radius + 11));
        }
      }
    }
    runtime.enemyState.forEach((enemy, index) => {
      if (mode === 'refresh') enemies[index].setVisible(enemy.alive).setTexture('refresh-corgi', [1, 2, 3, 2][Math.floor((snapshot.elapsedMs + index * 90) / 110) % 4])
        .setFlipX(!enemy.forward).setPosition(enemy.x + CORGI_WIDTH / 2 - cameraX, enemy.y + CORGI_HEIGHT - cameraY);
      else enemies[index].setVisible(enemy.alive).setTexture(enemy.forward ? 'corgi-right' : 'corgi-left').setPosition(enemy.x - cameraX, enemy.y - cameraY);
    });
    if (mode === 'original') {
      graphics.fillStyle(0x000000);
      for (let life = 0; life < snapshot.lives; life++) graphics.fillRect(950 + life * 20, 20, 10, 40);
    }
    for (let index = runtime.enemyState.length; index < enemies.length; index++) enemies[index].setVisible(false);
    const boss = runtime.bossState;
    bossSprite.setVisible(boss.active).setPosition(boss.x + (mode === 'refresh' ? 45 : 0) - cameraX, boss.y + (mode === 'refresh' ? 65 : 0) - cameraY).setAlpha(boss.hitCooldown > 0 ? 0.5 : 1);
    if (mode === 'refresh') bossSprite.setFrame([1, 2, 3, 2][Math.floor(snapshot.elapsedMs / 140) % 4]).setFlipX(true);
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
    let key = snapshot.deathMs > 0 ? 'player-death' : snapshot.onLeftWall ? 'player-wall-left' : snapshot.onRightWall ? 'player-wall-right' :
      snapshot.leftPressed ? snapshot.yVel > 0 ? 'player-fall-left' : 'player-run-left' :
      snapshot.rightPressed ? snapshot.yVel > 0 ? 'player-fall-right' : 'player-run-right' : 'player-idle';
    if (mode === 'refresh') {
      if (snapshot.leftPressed) facingLeft = true;
      else if (snapshot.rightPressed) facingLeft = false;
      if (snapshot.deathMs === 0 && !snapshot.onLeftWall && !snapshot.onRightWall && snapshot.inAir)
        key = 'player-' + (snapshot.yVel < 0 ? 'rise-' : 'fall-') + (facingLeft ? 'left' : 'right');
      player.setFlipX(snapshot.onLeftWall ? true : snapshot.onRightWall ? false : facingLeft);
      key = 'refresh-' + key;
      player.setPosition(position.x + 17.5 - cameraX, position.y + 50 - cameraY);
    } else player.setPosition(position.x - cameraX, position.y - cameraY);
    if (player.anims.currentAnim?.key !== key) player.play(key);
    if (runtime.isPaused || !started || snapshot.status !== 'playing') player.anims.pause();
    else player.anims.resume();
  };
  emit();
  const game = new Phaser.Game({
    type: Phaser.AUTO, parent, width: viewWidth * renderScale, height: viewHeight * renderScale,
    audio: { noAudio: true },
    backgroundColor: '#a0cedf',
    render: { antialias: false, pixelArt: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH, width: viewWidth * renderScale, height: viewHeight * renderScale },
    scene: [WorldScene],
  });
  const resize = () => {
    if (!game.isBooted) return;
    viewWidth = portrait() ? 640 : GAME_WIDTH; viewHeight = portrait() ? 960 : GAME_HEIGHT;
    game.scale.setGameSize(viewWidth * renderScale, viewHeight * renderScale);
    game.scale.setParentSize(parent.clientWidth, parent.clientHeight);
    resetCamera();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(parent);
  window.addEventListener('resize', resize);
  return {
    destroy: () => { observer.disconnect(); window.removeEventListener('resize', resize); music.stop(); sounds?.destroy(); effects.clear(); terrainTiles?.destroy(); game.destroy(true); delete window.__PIERRE_DEBUG__; },
    start: () => {
      if (!ready || !runtime) return;
      if (runtime.snapshot.status !== 'playing') runtime.restartLevel();
      sounds?.unlock(); started = true; runtime.setPaused(false); resumeMusic(); emit();
    },
    newRun: () => { if (!ready || !runtime) return; clearFeedback(); sounds?.unlock(); runtime.startNewRun(); started = true; resetCamera(); resumeMusic(); emit(); },
    menu: () => { started = false; runtime?.setPaused(true); clearFeedback(); music.stop(); emit(); },
    restartLevel: () => { if (!ready || !runtime) return; clearFeedback(); sounds?.unlock(); runtime.restartLevel(); started = true; resetCamera(); resumeMusic(); emit(); },
    selectLevel: index => { if (!ready || !runtime) return; clearFeedback(); sounds?.unlock(); runtime.selectLevel(index); started = true; resetCamera(); resumeMusic(); emit(); },
    togglePause: () => { const paused = runtime?.togglePause() ?? false; if (paused) { music.pause(); sounds?.setActive(false); } else { sounds?.unlock(); resumeMusic(); } emit(); return paused; },
    setPaused: paused => { runtime?.setPaused(paused); if (paused) { music.pause(); sounds?.setActive(false); } else { sounds?.unlock(); resumeMusic(); } emit(); },
    setAudio: (muted, volume) => { music.configure(muted, volume); sounds?.configure(muted, volume); if (!muted) { if (started) sounds?.unlock(); resumeMusic(); } },
    setAction: (action, pressed) => { if (started) { if (pressed && !runtime?.isPaused) sounds?.unlock(); runtime?.setAction(action, pressed); } },
  };
};
