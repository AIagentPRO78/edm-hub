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

  it('swaps in a fresh iframe with the new embed on track change', () => {
    const player = createPlayer();
    const el = createDeckBar(player);
    player.play(artist, artist.tracks[0]!);
    expect(el.querySelector('iframe')!.src).toContain('gCYcHz2k5x0');
    player.play(artist, { title: 'Scared', platform: 'youtube', ref: 'abc123', kind: 'track' });
    const iframes = el.querySelectorAll('iframe');
    expect(iframes.length).toBe(1); // old torn down, one mounted
    expect(iframes[0]!.src).toContain('abc123');
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

  it('renders a skip button that calls onSkip', () => {
    const onSkip = vi.fn();
    const el = createDeckBar(createPlayer(), { onSkip });
    const skip = el.querySelector('.deck__skip') as HTMLButtonElement | null;
    expect(skip).not.toBeNull();
    skip!.click();
    expect(onSkip).toHaveBeenCalledTimes(1);
  });

  it('omits the skip button when no onSkip handler is given', () => {
    const el = createDeckBar(createPlayer());
    expect(el.querySelector('.deck__skip')).toBeNull();
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

  it('auto-advances via the watchdog when the player never attaches', () => {
    vi.useFakeTimers();
    try {
      const onEnded = vi.fn();
      const player = createPlayer();
      createDeckBar(player, { onEnded });
      player.play(artist, artist.tracks[0]!); // youtube; no window.YT -> never attaches
      expect(onEnded).not.toHaveBeenCalled();
      vi.advanceTimersByTime(15000);
      expect(onEnded).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('auto-advances when the embed reports a terminal error', () => {
    const handlers: Record<string, () => void> = {};
    const bind = vi.fn((e: string, c: () => void) => { handlers[e] = c; });
    const Widget = Object.assign(() => ({ bind, unbind: vi.fn() }), {
      Events: { FINISH: 'finish', READY: 'ready', ERROR: 'error' },
    });
    (window as unknown as { SC: unknown }).SC = { Widget };
    try {
      const onEnded = vi.fn();
      const player = createPlayer();
      createDeckBar(player, { onEnded });
      const sc: Artist = {
        id: 'sc', name: 'SC', genres: ['Trance'], accent: '#19f0ff',
        tracks: [{ title: 't', platform: 'soundcloud', ref: 'https://soundcloud.com/a/b', kind: 'track' }],
      };
      player.play(sc, sc.tracks[0]!);
      handlers['error']!(); // embed failed -> skip to next
      expect(onEnded).toHaveBeenCalledTimes(1);
    } finally {
      delete (window as unknown as { SC?: unknown }).SC;
    }
  });
});
