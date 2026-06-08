import type { Artist } from '../../types';
import './filter-bar.css';

/**
 * Sticky search + genre filter above the wall. Computes a predicate from the
 * search text (name match) and the set of toggled genre chips (OR), hands it to
 * `apply` (which hides non-matching tiles and returns the visible count), and
 * announces the count in a live region. `initialQuery` seeds the search box from
 * the `?q=` URL param (the SearchAction target).
 */
export function createFilterBar(
  artists: Artist[],
  apply: (predicate: (a: Artist) => boolean) => number,
  initialQuery = '',
): HTMLElement {
  const genres = [...new Set(artists.flatMap((a) => a.genres))].sort((a, b) => a.localeCompare(b));
  const selected = new Set<string>();

  const bar = document.createElement('div');
  bar.className = 'filter';
  bar.setAttribute('role', 'search');
  bar.setAttribute('aria-label', 'Filter artists');

  const search = document.createElement('input');
  search.type = 'search';
  search.className = 'filter__search';
  search.placeholder = 'Search artists…';
  search.setAttribute('aria-label', 'Search artists by name');
  search.value = initialQuery;

  const clearBtn = document.createElement('button');
  clearBtn.type = 'button';
  clearBtn.className = 'filter__clear';
  clearBtn.textContent = 'Clear';
  clearBtn.hidden = true;

  const status = document.createElement('p');
  status.className = 'filter__status';
  status.setAttribute('role', 'status');
  status.setAttribute('aria-live', 'polite');

  const chips = document.createElement('div');
  chips.className = 'filter__genres';
  chips.setAttribute('role', 'group');
  chips.setAttribute('aria-label', 'Filter by genre');

  // Fold diacritics so "tiesto" matches "Tiësto", "beyonce" matches "Beyoncé", etc.
  const fold = (s: string): string =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

  const recompute = (): void => {
    const q = fold(search.value.trim());
    const predicate = (a: Artist): boolean =>
      (q === '' || fold(a.name).includes(q)) &&
      (selected.size === 0 || a.genres.some((g) => selected.has(g)));
    const count = apply(predicate);
    status.textContent = `${count} ${count === 1 ? 'artist' : 'artists'}`;
    clearBtn.hidden = q === '' && selected.size === 0;
  };

  for (const g of genres) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'filter__chip';
    chip.textContent = g;
    chip.setAttribute('aria-pressed', 'false');
    chip.addEventListener('click', () => {
      const on = !selected.has(g);
      if (on) selected.add(g);
      else selected.delete(g);
      chip.setAttribute('aria-pressed', String(on));
      recompute();
    });
    chips.append(chip);
  }

  search.addEventListener('input', recompute);
  clearBtn.addEventListener('click', () => {
    search.value = '';
    selected.clear();
    for (const c of chips.querySelectorAll('.filter__chip')) c.setAttribute('aria-pressed', 'false');
    recompute();
    search.focus();
  });

  const row = document.createElement('div');
  row.className = 'filter__row';
  row.append(search, clearBtn, status);
  bar.append(row, chips);

  recompute(); // initial apply (also honours ?q=)
  return bar;
}
