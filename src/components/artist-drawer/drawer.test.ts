// src/components/artist-drawer/drawer.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createArtistDrawer } from './drawer';
import type { Artist, Track } from '../../types';

const artist: Artist = {
  id: 'armin', name: 'Armin van Buuren', genres: ['Trance'], accent: '#ff2bd6',
  tracks: [
    { title: 'Communication', platform: 'soundcloud', ref: 'https://soundcloud.com/a/b', kind: 'track' },
    { title: 'ASOT 1000', platform: 'mixcloud', ref: 'https://www.mixcloud.com/a/c/', kind: 'set' },
  ],
};

describe('createArtistDrawer', () => {
  it('is hidden until opened', () => {
    const d = createArtistDrawer(() => {});
    expect(d.el.getAttribute('aria-hidden')).toBe('true');
  });
  it('lists the artist tracks when opened', () => {
    const d = createArtistDrawer(() => {});
    d.open(artist);
    expect(d.el.getAttribute('aria-hidden')).toBe('false');
    expect(d.el.querySelectorAll('.drawer__row').length).toBe(2);
    expect(d.el.textContent).toContain('Communication');
  });
  it('emits the chosen track on row click', () => {
    const onPick = vi.fn<(a: Artist, t: Track) => void>();
    const d = createArtistDrawer(onPick);
    d.open(artist);
    (d.el.querySelector('.drawer__row') as HTMLButtonElement).click();
    expect(onPick).toHaveBeenCalledWith(artist, artist.tracks[0]);
  });
  it('hides again on close', () => {
    const d = createArtistDrawer(() => {});
    d.open(artist);
    d.close();
    expect(d.el.getAttribute('aria-hidden')).toBe('true');
  });
});
