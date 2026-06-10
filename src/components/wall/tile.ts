import type { Artist } from '../../types';
import { avatarSrc } from '../../lib/image';
import './tile.css';

export function createTile(artist: Artist, onSelect: (a: Artist) => void): HTMLButtonElement {
  const el = document.createElement('button');
  el.className = 'tile';
  el.style.setProperty('--accent', artist.accent);
  el.dataset.artistId = artist.id;

  if (artist.image) {
    const img = document.createElement('img');
    const scrim = document.createElement('span');
    img.className = 'tile__img';
    img.loading = 'lazy';
    img.decoding = 'async';
    img.alt = '';
    img.src = avatarSrc(artist.image);
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

  // Visually-hidden affordance. Keeping it after the visible name/genre means the
  // button's accessible name leads with its visible text, satisfying WCAG 2.5.3
  // (Label in Name) while still telling screen readers that clicking opens the
  // artist's track list rather than playing directly.
  const action = document.createElement('span');
  action.className = 'sr-only';
  action.textContent = 'Open tracks';

  el.append(name, genre, action);
  el.addEventListener('click', () => onSelect(artist));
  return el;
}
