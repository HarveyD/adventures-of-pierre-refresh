export type RouteMode = 'original' | 'refresh';

export type PlatformType = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface LegacyPlatform {
  ordinal: number;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  type: PlatformType;
  movementRange: number;
  movementOffset: number;
}

export interface LegacyLevel {
  index: number;
  platformCount: number;
  platforms: LegacyPlatform[];
}

export interface LegacyCampaign {
  headerBackground: string | null;
  levels: LegacyLevel[];
}

export type AssetStatus = 'present' | 'case-mismatch' | 'mapped' | 'placeholder';

export interface FileAssetDefinition {
  key: string;
  kind: 'image' | 'audio';
  url: string;
  status: AssetStatus;
  note?: string;
}

export interface GeneratedImageDefinition {
  key: string;
  kind: 'generated-image';
  width: number;
  height: number;
  label: string;
  background: string;
  foreground: string;
  status: 'placeholder';
  note: string;
}

export type AssetDefinition = FileAssetDefinition | GeneratedImageDefinition;