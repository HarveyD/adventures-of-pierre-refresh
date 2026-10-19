import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parseLegacyLevels } from './levelParser';

const levelsText = readFileSync(new URL('../../public/assets/original/data/Levels2.txt', import.meta.url), 'utf8');

describe('parseLegacyLevels', () => {
  it('skips the legacy non-numeric header and parses all five levels', () => {
    const campaign = parseLegacyLevels(levelsText);

    expect(campaign.headerBackground).toBe('background 1.png');
    expect(campaign.levels).toHaveLength(5);
    expect(campaign.levels.map((level) => level.platformCount)).toEqual([22, 18, 28, 23, 3]);
  });

  it('preserves the original half-scale coordinate transform', () => {
    const campaign = parseLegacyLevels(levelsText);
    const firstPlatform = campaign.levels[0].platforms[0];
    const movingPlatform = campaign.levels[1].platforms[6];
    const movingHazard = campaign.levels[3].platforms[17];

    expect(firstPlatform).toMatchObject({
      ordinal: 1,
      label: 'bottom of pits',
      x: 200,
      y: 500,
      width: 4500,
      height: 500,
      type: 5,
    });

    expect(movingPlatform).toMatchObject({
      label: 'first moving platform',
      x: 1900,
      y: 340,
      movementRange: 400,
      movementOffset: 0,
      type: 3,
    });

    expect(movingHazard).toMatchObject({
      label: 'moving death platform 1',
      x: 3200,
      y: 90,
      movementRange: 100,
      movementOffset: 0,
      type: 6,
    });
  });

  it('truncates odd and negative values exactly as Java does', () => {
    const campaign = parseLegacyLevels(levelsText);
    expect(campaign.levels[0].platforms[16]).toMatchObject({ y: 339, width: 2 });
    expect(campaign.levels[2].platforms[27].y).toBe(-500);
    expect(campaign.levels[2].platforms[13].movementOffset).toBe(249);
  });

  it.each(['NaN', '3junk', '', '1.5', 'Infinity'])('rejects malformed numeric token %s', (token) => {
    expect(() => parseLegacyLevels(`1\n1\n1 bad,${token},680,100,100,0`)).toThrow(/Line 3/);
  });

  it('rejects unknown types, missing movement fields, negative counts, and zero dimensions', () => {
    expect(() => parseLegacyLevels('1\n1\n1 bad,0,0,100,100,7')).toThrow(/unsupported/);
    expect(() => parseLegacyLevels('1\n1\n1 bad,0,0,100,100,3,20')).toThrow(/movement offset/);
    expect(() => parseLegacyLevels('-1')).toThrow(/count/);
    expect(() => parseLegacyLevels('1\n1\n1 bad,0,0,0,100,0')).toThrow(/dimensions/);
  });
});
