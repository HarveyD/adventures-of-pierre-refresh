export const refreshBackgrounds = [
  { key: 'refresh-dunes', file: 'egypt-dunes-v1.png' },
  { key: 'refresh-ruins', file: 'egypt-ruins-v1.png' },
  { key: 'refresh-snow', file: 'snow-v1.png' },
  { key: 'refresh-moon', file: 'moon-v1.png' },
] as const;

export const refreshBackgroundByLevel = ['landscape', ...refreshBackgrounds.map(background => background.key)];
