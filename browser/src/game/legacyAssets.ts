import metadata from '../../public/assets/derived/media.json';
export const assetUrl = (path: string): string => import.meta.env.BASE_URL + path.split('/').map(encodeURIComponent).join('/');
export const legacyUrl = (filename: string) => assetUrl('assets/original/legacy/' + filename);
export const derivedUrl = (filename: string) => assetUrl('assets/derived/' + filename);
export const media = metadata;
export const legacyAssetManifest = [
  { key: 'landscape', file: 'Background 1.png', status: 'present' },
  { key: 'corgi-left', file: 'CorgismallLEFT.png', status: 'present' },
  { key: 'corgi-right', file: 'CorgismallRIGHT.png', status: 'present' },
  { key: 'cloud-1', file: 'Cloud 1.png', status: 'case-mismatch' },
  { key: 'cloud-2', file: 'cloud 2.png', status: 'present' },
  { key: 'cloud-3', file: 'cloud 3.png', status: 'present' },
] as const;
export const menuAssets = ['MenuScreen.png', 'ControlScreen.png', 'HelpScreen.png', 'GameOver.png'];
export const legacyMusicByLevel = ['training', 'egypt', 'egypt', 'snow', 'moon'] as const;
