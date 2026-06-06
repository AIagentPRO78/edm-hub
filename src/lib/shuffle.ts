import type { Artist, Track } from '../types';

export interface Selection {
  artist: Artist;
  track: Track;
}

/**
 * Pick a random playable track, avoiding an immediate repeat of the same
 * artist when other artists are available. `rand` is injectable for tests.
 */
export function pickRandomTrack(
  artists: Artist[],
  currentArtistId?: string,
  rand: () => number = Math.random,
): Selection | null {
  const playable = artists.filter((a) => a.tracks.length > 0);
  if (playable.length === 0) return null;

  const pool =
    playable.length > 1 && currentArtistId
      ? playable.filter((a) => a.id !== currentArtistId)
      : playable;

  const artist = pool[Math.floor(rand() * pool.length)]!;
  const track = artist.tracks[Math.floor(rand() * artist.tracks.length)]!;
  return { artist, track };
}
