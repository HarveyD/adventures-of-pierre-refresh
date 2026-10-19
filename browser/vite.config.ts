import { defineConfig } from 'vite';
import { copyFileSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { refreshBackgrounds } from './src/game/refreshBackgrounds';
import { refreshSpriteAssets } from './src/game/refreshSprites';

export default defineConfig(({ command }) => ({
  base: process.env.PIERRE_BASE_PATH || '/',
  publicDir: command === 'build' ? false : 'public',
  plugins: [{
    name: 'pierre-distribution-assets',
    generateBundle() {
      // Publish playable media only. The source WAV/GIF masters stay in the archive.
      const legacy = [
        'Background 1.png', 'CorgismallLEFT.png', 'CorgismallRIGHT.png',
        'Cloud 1.png', 'cloud 2.png', 'cloud 3.png',
        'MenuScreen.png', 'ControlScreen.png', 'HelpScreen.png', 'GameOver.png',
      ];
      const files = [
        ...legacy.map(name => 'assets/original/legacy/' + name),
        'assets/original/data/Levels2.txt',
        ...refreshBackgrounds.map(background => 'assets/refresh/backgrounds/' + background.file),
        ...refreshSpriteAssets.map(asset => 'assets/refresh/sprites/' + asset.file),
        ...readdirSync(resolve('public/assets/derived')).map(name => 'assets/derived/' + name),
      ];
      for (const fileName of files) this.emitFile({ type: 'asset', fileName, source: readFileSync(resolve('public', fileName)) });
    },
    writeBundle(options) {
      const output = resolve(options.dir ?? 'dist');
      for (const edition of ['original', 'refresh']) {
        mkdirSync(resolve(output, edition), { recursive: true });
        copyFileSync(resolve(output, 'index.html'), resolve(output, edition, 'index.html'));
      }
    },
  }],
  build: { rollupOptions: { output: { manualChunks: { phaser: ['phaser'] } } } },
  server: { host: '127.0.0.1', port: 4173 },
  preview: { host: '127.0.0.1', port: 4173 },
}));
