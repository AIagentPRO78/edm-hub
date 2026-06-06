import type { Artist } from '../../types';
import './tile.css';

export function createTile(artist: Artist, onSelect: (a: Artist) => void): HTMLButtonElement {
  const el = document.createElement('button');
  el.className = 'tile';
  el.style.setProperty('--accent', artist.accent);
  el.setAttribute('aria-label', `Play ${artist.name}`);
  el.dataset.artistId = artist.id;

  if (artist.image) {
    const img = document.createElement('img');
    const scrim = document.createElement('span');
    img.className = 'tile__img';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.alt = '';
    img.src = artist.image;
    scrim.className = 'tile__scrim';
    // If the official artwork fails to load, drop it and fall back to the
    // typographic neon tile.
    img.addEventListener('error', () => {
      img.remove();
      scrim.remove();
    });
    el.append(img, scrim);
  }

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
