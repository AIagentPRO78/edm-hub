// src/components/hero/hero.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createHero } from './hero';

describe('createHero', () => {
  it('renders the DJ SET wordmark in an h1', () => {
    const el = createHero({ onStart: () => {}, onShuffle: () => {} });
    const h1 = el.querySelector('h1');
    expect(h1?.textContent).toContain('DJ SET');
  });
  it('fires onStart when Start the set is clicked', () => {
    const onStart = vi.fn();
    const el = createHero({ onStart, onShuffle: () => {} });
    (el.querySelector('[data-action="start"]') as HTMLButtonElement).click();
    expect(onStart).toHaveBeenCalled();
  });
  it('fires onShuffle when Shuffle all is clicked', () => {
    const onShuffle = vi.fn();
    const el = createHero({ onStart: () => {}, onShuffle });
    (el.querySelector('[data-action="shuffle"]') as HTMLButtonElement).click();
    expect(onShuffle).toHaveBeenCalled();
  });
});
