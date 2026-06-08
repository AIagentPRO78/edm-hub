import { describe, it, expect } from 'vitest';
import { createFilterBar } from './filter-bar';
import type { Artist } from '../../types';

const artists: Artist[] = [
  { id: 'a', name: 'Armin van Buuren', genres: ['Trance'], accent: '#fff', tracks: [] },
  { id: 'b', name: 'Tiësto', genres: ['Big Room'], accent: '#fff', tracks: [] },
  { id: 'c', name: 'Charlotte de Witte', genres: ['Techno'], accent: '#fff', tracks: [] },
];

describe('createFilterBar', () => {
  it('renders a search box and one chip per unique genre', () => {
    const bar = createFilterBar(artists, () => artists.length);
    expect(bar.querySelector('.filter__search')).not.toBeNull();
    expect(bar.querySelectorAll('.filter__chip').length).toBe(3);
  });

  it('matches names with diacritic folding (tiesto -> Tiësto)', () => {
    let pred: ((a: Artist) => boolean) | null = null;
    const bar = createFilterBar(artists, (p) => { pred = p; return artists.filter(p).length; });
    const search = bar.querySelector('.filter__search') as HTMLInputElement;
    search.value = 'tiesto';
    search.dispatchEvent(new Event('input'));
    expect(artists.filter(pred!).map((a) => a.id)).toEqual(['b']);
  });

  it('filters by genre chip and reports the count in the status region', () => {
    const bar = createFilterBar(artists, (p) => artists.filter(p).length);
    const chip = [...bar.querySelectorAll<HTMLButtonElement>('.filter__chip')].find((c) => c.textContent === 'Techno')!;
    chip.click();
    expect(chip.getAttribute('aria-pressed')).toBe('true');
    expect(bar.querySelector('.filter__status')!.textContent).toBe('1 artist');
  });

  it('seeds the search box from initialQuery', () => {
    const bar = createFilterBar(artists, () => 1, 'armin');
    expect((bar.querySelector('.filter__search') as HTMLInputElement).value).toBe('armin');
  });

  it('Clear resets the search and chips and hides itself', () => {
    const bar = createFilterBar(artists, (p) => artists.filter(p).length);
    const search = bar.querySelector('.filter__search') as HTMLInputElement;
    search.value = 'armin';
    search.dispatchEvent(new Event('input'));
    const clear = bar.querySelector('.filter__clear') as HTMLButtonElement;
    expect(clear.hidden).toBe(false);
    clear.click();
    expect(search.value).toBe('');
    expect(clear.hidden).toBe(true);
  });
});
