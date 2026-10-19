import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { refreshBackgroundByLevel, refreshBackgrounds } from './refreshBackgrounds';

describe('Refresh chapter artwork', () => {
  it('keeps training original and gives the remaining chapters distinct artwork', () => {
    expect(refreshBackgroundByLevel).toEqual(['landscape', 'refresh-dunes', 'refresh-ruins', 'refresh-snow', 'refresh-moon']);
  });
  it.each(refreshBackgrounds)('ships the approved $key illustration unchanged', background => {
    const published = readFileSync(new URL('../../public/assets/refresh/backgrounds/' + background.file, import.meta.url));
    expect(published.equals(readFileSync(new URL('../../design/backgrounds/' + background.file, import.meta.url)))).toBe(true);
    expect(published.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
    expect([published.readUInt32BE(16), published.readUInt32BE(20)]).toEqual([1672, 941]);
  });
});
