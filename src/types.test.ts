// src/types.test.ts
import { describe, it, expect } from 'vitest';
import { isArtist } from './types';

describe('isArtist', () => {
  it('accepts a well-formed artist', () => {
    const a = {
      id: 'armin-van-buuren', name: 'Armin van Buuren', genres: ['Trance'],
      accent: '#ff2bd6',
      tracks: [{ title: 'Communication', platform: 'soundcloud', ref: 'https://soundcloud.com/x/y', kind: 'track' }],
    };
    expect(isArtist(a)).toBe(true);
  });

  it('rejects an artist with no tracks array', () => {
    expect(isArtist({ id: 'x', name: 'X', genres: [], accent: '#fff' })).toBe(false);
  });

  it('rejects a track with an unknown platform', () => {
    const a = {
      id: 'x', name: 'X', genres: [], accent: '#fff',
      tracks: [{ title: 't', platform: 'bandcamp', ref: 'r', kind: 'track' }],
    };
    expect(isArtist(a)).toBe(false);
  });
});
