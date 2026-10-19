import { readdirSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { legacyAssetManifest, legacyMusicByLevel, media, menuAssets } from './legacyAssets';

describe('browser media', () => {
  it('resolves all original files with exact case', () => {
    const names = readdirSync(new URL('../../public/assets/original/legacy/', import.meta.url));
    for (const name of [...legacyAssetManifest.map(asset => asset.file), ...menuAssets]) expect(names).toContain(name);
  });
  it('has complete atlases with preserved source hashes and per-frame timing', () => {
    for (const info of Object.values(media.animations)) {
      const bytes = readFileSync(new URL('../../public/assets/derived/' + info.file, import.meta.url));
      expect(bytes.subarray(1, 4).toString()).toBe('PNG');
      expect(bytes.readUInt32BE(16)).toBe(info.width * info.durations.length);
      expect(bytes.readUInt32BE(20)).toBe(info.height);
      expect(info.durations.every(duration => duration > 0)).toBe(true);
    }
    for (const [name, hash] of Object.entries(media.sources)) {
      expect(createHash('sha256').update(readFileSync(new URL('../../../Harvey Java/' + name, import.meta.url))).digest('hex')).toBe(hash);
    }
    expect(media.animations['player-run-right'].durations).toHaveLength(12);
  });
  it('ships compressed MP3 and Ogg alternatives for every level track', () => {
    for (const key of legacyMusicByLevel) for (const ext of ['mp3', 'ogg']) {
      const bytes = readFileSync(new URL('../../public/assets/derived/' + key + '.' + ext, import.meta.url));
      expect(bytes.byteLength).toBeGreaterThan(1000);
      expect(bytes.byteLength).toBeLessThan(1_500_000);
    }
  });
  it('opens with the training track and assigns the available music by chapter', () => {
    expect(legacyMusicByLevel.map(key => media.audio[key].source)).toEqual([
      'training level.wav', 'egyptian level.wav', 'egyptian level.wav', 'snow level.wav', 'moon level.wav',
    ]);
  });
});
