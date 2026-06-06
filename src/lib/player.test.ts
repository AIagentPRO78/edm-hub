// src/lib/player.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createPlayer } from './player';
import type { Artist, Track } from '../types';

const track: Track = { title: 'Strobe', platform: 'youtube', ref: 'abc', kind: 'track' };
const artist: Artist = { id: 'deadmau5', name: 'deadmau5', genres: ['Progressive House'], accent: '#19f0ff', tracks: [track] };

describe('createPlayer', () => {
  it('starts with nothing playing', () => {
    const p = createPlayer();
    expect(p.state.track).toBeNull();
    expect(p.state.artist).toBeNull();
  });

  it('notifies subscribers immediately and on play', () => {
    const p = createPlayer();
    const seen = vi.fn();
    p.subscribe(seen);
    expect(seen).toHaveBeenCalledTimes(1); // initial emit
    p.play(artist, track);
    expect(seen).toHaveBeenCalledTimes(2);
    expect(p.state.track).toEqual(track);
    expect(p.state.artist).toEqual(artist);
  });

  it('stops notifying after unsubscribe', () => {
    const p = createPlayer();
    const seen = vi.fn();
    const off = p.subscribe(seen);
    off();
    p.play(artist, track);
    expect(seen).toHaveBeenCalledTimes(1); // only the initial emit
  });
});
