// src/data/artists.test.ts
import { describe, it, expect } from 'vitest';
import { ARTISTS } from './artists';
import { isArtist } from '../types';

describe('ARTISTS', () => {
  it('is non-empty and every entry is a valid Artist', () => {
    expect(ARTISTS.length).toBeGreaterThan(0);
    for (const a of ARTISTS) expect(isArtist(a)).toBe(true);
  });

  it('every artist has at least one playable track', () => {
    for (const a of ARTISTS) expect(a.tracks.length).toBeGreaterThan(0);
  });

  it('assigns a non-empty accent to every artist', () => {
    for (const a of ARTISTS) expect(a.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('exposes only verified track refs (no sourceUrl/verified leakage in the Track shape)', () => {
    for (const a of ARTISTS) {
      for (const t of a.tracks) {
        expect(Object.keys(t).sort()).toEqual(['kind', 'platform', 'ref', 'title']);
      }
    }
  });
});
