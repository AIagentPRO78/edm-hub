// src/components/wall/tile.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createTile } from './tile';
import type { Artist } from '../../types';

const artist: Artist = {
  id: 'tiesto', name: 'Tiësto', genres: ['Big Room'], accent: '#ff2bd6',
  tracks: [{ title: 'Red Lights', platform: 'youtube', ref: 'abc', kind: 'track' }],
};

describe('createTile', () => {
  it('renders the artist name and is a button for a11y', () => {
    const el = createTile(artist, () => {});
    expect(el.tagName).toBe('BUTTON');
    expect(el.textContent).toContain('Tiësto');
  });
  it('applies the accent as a CSS custom property', () => {
    const el = createTile(artist, () => {});
    expect(el.style.getPropertyValue('--accent')).toBe('#ff2bd6');
  });
  it('invokes the callback with the artist on click', () => {
    const onSelect = vi.fn();
    const el = createTile(artist, onSelect);
    el.click();
    expect(onSelect).toHaveBeenCalledWith(artist);
  });

  it('renders the official artwork image when one is provided', () => {
    const withImg: Artist = { ...artist, image: 'https://i.ytimg.com/vi/abc/hqdefault.jpg' };
    const el = createTile(withImg, () => {});
    const img = el.querySelector('img.tile__img') as HTMLImageElement | null;
    expect(img).not.toBeNull();
    expect(img!.src).toContain('hqdefault.jpg');
    expect(el.querySelector('.tile__scrim')).not.toBeNull();
  });

  it('renders no image element when none is provided', () => {
    const el = createTile(artist, () => {});
    expect(el.querySelector('img.tile__img')).toBeNull();
  });

  it('drops the image and scrim if the artwork fails to load', () => {
    const withImg: Artist = { ...artist, image: 'https://yt3.googleusercontent.com/x=s400-c-k' };
    const el = createTile(withImg, () => {});
    const img = el.querySelector('img.tile__img') as HTMLImageElement;
    expect(img).not.toBeNull();
    img.dispatchEvent(new Event('error'));
    expect(el.querySelector('img.tile__img')).toBeNull();
    expect(el.querySelector('.tile__scrim')).toBeNull();
  });
});
