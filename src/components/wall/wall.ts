import type { Artist } from '../../types';
import { createTile } from './tile';
import './wall.css';

export interface WallElement extends HTMLElement {
  setActive(artistId: string | null): void;
}

export function createWall(artists: Artist[], onSelect: (a: Artist) => void): WallElement {
  const section = document.createElement('section') as WallElement;
  section.className = 'wall';
  section.setAttribute('aria-label', 'The legends wall');

  const grid = document.createElement('div');
  grid.className = 'wall__grid';

  for (const artist of artists) grid.append(createTile(artist, onSelect));
  section.append(grid);

  section.setActive = (artistId: string | null) => {
    for (const tile of grid.querySelectorAll<HTMLElement>('.tile')) {
      tile.setAttribute('aria-current', tile.dataset.artistId === artistId ? 'true' : 'false');
    }
  };

  return section;
}
