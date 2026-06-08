import { type Artist, type Track, PLATFORMS, KINDS } from '../types';
import seed from './artists.seed.json';

const ACCENTS = ['#ff2bd6', '#19f0ff', '#b14bff', '#ff5ab1', '#2bff9e', '#ffd23d', '#ff7a3d', '#5a8cff'] as const;

// The runtime seed is slimmed at build time (slimSeedPlugin in vite.config.ts):
// curator-only fields (notes, sourceUrl, verified) are stripped and only
// verified tracks survive, so the shape consumed here is the lean one.
interface SeedTrack {
  title: string;
  platform: string;
  ref: string;
  kind: string;
}
interface SeedArtist {
  id: string;
  name: string;
  genres: string[];
  tracks: SeedTrack[];
  image?: string;
}

function toTrack(s: SeedTrack): Track | null {
  if (!PLATFORMS.has(s.platform) || !KINDS.has(s.kind)) return null;
  return {
    title: s.title,
    platform: s.platform as Track['platform'],
    ref: s.ref,
    kind: s.kind as Track['kind'],
  };
}

export const ARTISTS: Artist[] = (seed as SeedArtist[])
  .map((s, i): Artist => ({
    id: s.id,
    name: s.name,
    genres: s.genres,
    accent: ACCENTS[i % ACCENTS.length]!,
    tracks: s.tracks.map(toTrack).filter((t): t is Track => t !== null),
    ...(s.image ? { image: s.image } : {}),
  }))
  .filter((a) => {
    if (a.tracks.length === 0) {
      if (import.meta.env.DEV) {
        console.warn(`[artists] dropping "${a.id}" — no verified tracks`);
      }
      return false;
    }
    return true;
  });
