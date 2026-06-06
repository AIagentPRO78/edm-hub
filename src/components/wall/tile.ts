import type { Artist } from '../../types';
import './tile.css';

export function createTile(artist: Artist, onSelect: (a: Artist) => void): HTMLButtonElement {
  const el = document.createElement('button');
  el.className = 'tile';
  el.style.setProperty('--accent', artist.accent);
  el.setAttribute('aria-label', `Play ${artist.name}`);
  el.dataset.artistId = artist.id;

  const name = document.createElement('span');
  name.className = 'tile__name';
  name.textContent = artist.name;

  const genre = document.createElement('span');
  genre.className = 'tile__genre';
  genre.textContent = artist.genres[0] ?? '';

  el.append(name, genre);
  el.addEventListener('click', () => onSelect(artist));
  return el;
}
