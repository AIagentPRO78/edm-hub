// src/components/wall/wall.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createWall } from './wall';
import type { Artist } from '../../types';

const artists: Artist[] = [
  { id: 'a', name: 'A', genres: ['Trance'], accent: '#ff2bd6', tracks: [{ title: 't', platform: 'youtube', ref: 'x', kind: 'track' }] },
  { id: 'b', name: 'B', genres: ['Techno'], accent: '#19f0ff', tracks: [{ title: 't', platform: 'youtube', ref: 'y', kind: 'track' }] },
];

describe('createWall', () => {
  it('renders one tile per artist', () => {
    const el = createWall(artists, () => {});
    expect(el.querySelectorAll('.tile').length).toBe(2);
  });
  it('forwards tile selection', () => {
    const onSelect = vi.fn();
    const el = createWall(artists, onSelect);
    (el.querySelector('.tile') as HTMLButtonElement).click();
    expect(onSelect).toHaveBeenCalledWith(artists[0]);
  });
  it('marks the active artist with aria-current', () => {
    const el = createWall(artists, () => {});
    el.setActive('b');
    expect((el.querySelector('[data-artist-id="b"]') as HTMLElement).getAttribute('aria-current')).toBe('true');
    expect((el.querySelector('[data-artist-id="a"]') as HTMLElement).getAttribute('aria-current')).toBe('false');
  });
});
