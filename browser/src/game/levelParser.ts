import type { LegacyCampaign, LegacyLevel, LegacyPlatform, PlatformType } from './types';

const integer = (token: string | undefined, field: string, line: number): number => {
  if (!token || !/^-?\d+$/.test(token.trim())) throw new Error(`Line ${line}: invalid integer for ${field}.`);
  const value = Number(token.trim());
  if (!Number.isSafeInteger(value)) throw new Error(`Line ${line}: ${field} is outside the integer range.`);
  return value;
};

export const parseLegacyLevels = (raw: string): LegacyCampaign => {
  const lines = raw.split(/\r?\n/).map((text, index) => ({ text: text.trim(), line: index + 1 })).filter(row => row.text);
  if (!lines.length) throw new Error('Level data is empty.');
  let cursor = 0;
  let headerBackground: string | null = null;
  if (!/^-?\d+$/.test(lines[0].text)) headerBackground = lines[cursor++].text;
  let declared: number | null = null;
  if (lines[cursor + 1] && /^-?\d+$/.test(lines[cursor + 1].text)) {
    declared = integer(lines[cursor].text, 'level count', lines[cursor].line);
    if (declared <= 0) throw new Error('Level count must be positive.');
    cursor++;
  }
  const levels: LegacyLevel[] = [];
  while (cursor < lines.length) {
    const row = lines[cursor++];
    const count = integer(row.text, 'platform count', row.line);
    if (count <= 0 || count > 10000) throw new Error(`Line ${row.line}: invalid platform count.`);
    const platforms: LegacyPlatform[] = [];
    for (let index = 0; index < count; index++) {
      const row = lines[cursor++];
      if (!row) throw new Error(`Unexpected end of file in level ${levels.length + 1}.`);
      const parts = row.text.split(',').map(part => part.trim());
      const label = /^(\d+)\s*(.*)$/.exec(parts[0]);
      if (!label || parts.length < 6) throw new Error(`Line ${row.line}: malformed platform.`);
      const get = (i: number, field: string) => integer(parts[i], field, row.line);
      const type = get(5, 'type');
      if (type < 0 || type > 6) throw new Error(`Line ${row.line}: unsupported platform type ${type}.`);
      const width = Math.trunc(get(3, 'width') / 2);
      const height = Math.trunc(get(4, 'height') / 2);
      if (width <= 0 || height <= 0) throw new Error(`Line ${row.line}: dimensions must remain positive after scaling.`);
      const moving = type === 3 || type === 6;
      const range = moving ? Math.trunc(get(6, 'movement range') / 2) : 0;
      const offset = moving ? Math.trunc(get(7, 'movement offset') / 2) : 0;
      if (range < 0) throw new Error(`Line ${row.line}: movement range must be nonnegative.`);
      platforms.push({
        ordinal: integer(label[1], 'ordinal', row.line), label: label[2],
        x: Math.trunc(get(1, 'x') / 2), y: Math.trunc(get(2, 'y') / 2),
        width, height, type: type as PlatformType, movementRange: range, movementOffset: offset,
      });
    }
    levels.push({ index: levels.length, platformCount: count, platforms });
  }
  if (declared !== null && declared !== levels.length) throw new Error(`Expected ${declared} levels but parsed ${levels.length}.`);
  return { headerBackground, levels };
};

export const loadLegacyLevels = async (url: string): Promise<LegacyCampaign> => {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Unable to load level data: ${response.status}`);
  return parseLegacyLevels(await response.text());
};
