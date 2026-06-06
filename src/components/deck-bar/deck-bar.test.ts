import { describe, it, expect } from 'vitest';
import { createDeckBar } from './deck-bar';
import { createPlayer } from '../../lib/player';
import type { Artist } from '../../types';

const artist: Artist = {
  id: 'garrix', name: 'Martin Garrix', genres: ['Big Room'], accent: '#ff2bd6',
  tracks: [{ title: 'Animals', platform: 'youtube', ref: 'gCYcHz2k5x0', kind: 'track' }],
};

describe('createDeckBar', () => {
  it('shows an idle state with no iframe before anything plays', () => {
    const player = createPlayer();
    const el = createDeckBar(player);
    expect(el.querySelector('iframe')).toBeNull();
    expect(el.textContent).toContain('Nothing playing');
  });

  it('mounts an iframe with the embed src when a track plays', () => {
    const player = createPlayer();
    const el = createDeckBar(player);
    player.play(artist, artist.tracks[0]!);
    const iframe = el.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe!.src).toContain('youtube-nocookie.com/embed/gCYcHz2k5x0');
    expect(el.textContent).toContain('Martin Garrix');
    expect(el.textContent).toContain('Animals');
  });

  it('reuses the same iframe element across track changes (keeps it alive)', () => {
    const player = createPlayer();
    const el = createDeckBar(player);
    player.play(artist, artist.tracks[0]!);
    const first = el.querySelector('iframe');
    player.play(artist, { title: 'Scared', platform: 'youtube', ref: 'abc123', kind: 'track' });
    const second = el.querySelector('iframe');
    expect(second).toBe(first); // same node, only src changed
    expect(second!.src).toContain('abc123');
  });
});
