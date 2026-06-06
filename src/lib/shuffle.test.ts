import { describe, it, expect } from 'vitest';
import { pickRandomTrack } from './shuffle';
import type { Artist } from '../types';

const A = (id: string, n = 2): Artist => ({
  id, name: id, genres: [], accent: '#ffffff',
  tracks: Array.from({ length: n }, (_, i) => ({
    title: `${id}-${i}`, platform: 'youtube' as const, ref: `${id}${i}`, kind: 'track' as const,
  })),
});

describe('pickRandomTrack', () => {
  it('returns null for an empty roster', () => {
    expect(pickRandomTrack([])).toBeNull();
  });

  it('returns a valid artist + track from the roster', () => {
    const arts = [A('a'), A('b')];
    const sel = pickRandomTrack(arts, undefined, () => 0)!;
    expect(arts).toContain(sel.artist);
    expect(sel.artist.tracks).toContain(sel.track);
  });

  it('avoids immediately repeating the current artist when others exist', () => {
    const arts = [A('a'), A('b'), A('c')];
    for (const r of [0, 0.34, 0.67, 0.99]) {
      expect(pickRandomTrack(arts, 'a', () => r)!.artist.id).not.toBe('a');
    }
  });

  it('still plays the only artist even if it is the current one', () => {
    expect(pickRandomTrack([A('solo')], 'solo', () => 0)!.artist.id).toBe('solo');
  });

  it('skips artists that have no tracks', () => {
    const empty: Artist = { id: 'x', name: 'x', genres: [], accent: '#fff', tracks: [] };
    const sel = pickRandomTrack([empty, A('y')], undefined, () => 0)!;
    expect(sel.artist.id).toBe('y');
  });
});
