import type { Artist } from '../../types';
import { createTile } from './tile';
import './wall.css';

export interface WallElement extends HTMLElement {
  setActive(artistId: string | null): void;
  /** Hide tiles whose artist fails the predicate; returns the visible count. */
  setFilter(predicate: (a: Artist) => boolean): number;
}

export function createWall(artists: Artist[], onSelect: (a: Artist) => void): WallElement {
  const section = document.createElement('section') as WallElement;
  section.className = 'wall';
  section.setAttribute('aria-label', 'The legends wall');

  const grid = document.createElement('div');
  grid.className = 'wall__grid';

  const entries = artists.map((artist) => ({ artist, tile: createTile(artist, onSelect) }));
  for (const { tile } of entries) grid.append(tile);
  section.append(grid);

  section.setActive = (artistId: string | null) => {
    for (const { tile } of entries) {
      tile.setAttribute('aria-current', tile.dataset.artistId === artistId ? 'true' : 'false');
    }
  };

  section.setFilter = (predicate: (a: Artist) => boolean): number => {
    let visible = 0;
    for (const { artist, tile } of entries) {
      const show = predicate(artist);
      tile.hidden = !show;
      if (show) visible++;
    }
    return visible;
  };

  return section;
}
