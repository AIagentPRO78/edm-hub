export type Platform = 'soundcloud' | 'youtube' | 'mixcloud';
export type TrackKind = 'track' | 'set';

export interface Track {
  title: string;
  platform: Platform;
  /** youtube=11-char video id; soundcloud/mixcloud=full permalink URL */
  ref: string;
  kind: TrackKind;
}

export interface Artist {
  id: string;
  name: string;
  genres: string[];
  /** neon hex used for the tile glow */
  accent: string;
  tracks: Track[];
  /** optional official platform artwork URL (artist-published, platform-served) */
  image?: string;
}

export const PLATFORMS: ReadonlySet<string> = new Set(['soundcloud', 'youtube', 'mixcloud']);
export const KINDS: ReadonlySet<string> = new Set(['track', 'set']);

function isTrack(v: unknown): v is Track {
  if (typeof v !== 'object' || v === null) return false;
  const t = v as Record<string, unknown>;
  return (
    typeof t.title === 'string' &&
    typeof t.ref === 'string' &&
    typeof t.platform === 'string' && PLATFORMS.has(t.platform) &&
    typeof t.kind === 'string' && KINDS.has(t.kind)
  );
}

export function isArtist(v: unknown): v is Artist {
  if (typeof v !== 'object' || v === null) return false;
  const a = v as Record<string, unknown>;
  return (
    typeof a.id === 'string' &&
    typeof a.name === 'string' &&
    typeof a.accent === 'string' &&
    Array.isArray(a.genres) && a.genres.every((g) => typeof g === 'string') &&
    Array.isArray(a.tracks) && a.tracks.every(isTrack)
  );
}
