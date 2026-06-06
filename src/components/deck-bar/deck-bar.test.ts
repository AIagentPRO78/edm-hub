import { describe, it, expect, vi } from 'vitest';
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

  it('renders a tip button when an onTip handler is provided', () => {
    const player = createPlayer();
    const onTip = vi.fn();
    const el = createDeckBar(player, { onTip });
    const tip = el.querySelector('.tip-button') as HTMLButtonElement | null;
    expect(tip).not.toBeNull();
    tip!.click();
    expect(onTip).toHaveBeenCalledTimes(1);
  });

  it('omits the tip button when no handler is given', () => {
    const el = createDeckBar(createPlayer());
    expect(el.querySelector('.tip-button')).toBeNull();
  });

  it('flags the deck for the tall visual player only while a SoundCloud track plays', () => {
    const player = createPlayer();
    const el = createDeckBar(player);
    const sc: Artist = {
      id: 'sc', name: 'SC', genres: ['Trance'], accent: '#19f0ff',
      tracks: [{ title: 't', platform: 'soundcloud', ref: 'https://soundcloud.com/a/b', kind: 'track' }],
    };
    player.play(sc, sc.tracks[0]!);
    expect(el.classList.contains('deck--sc')).toBe(true);
    player.play(artist, artist.tracks[0]!); // youtube
    expect(el.classList.contains('deck--sc')).toBe(false);
  });
});
