// src/main.test.ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mountApp } from './main';

describe('mountApp', () => {
  beforeEach(() => { document.body.innerHTML = '<div id="app"></div>'; });
  afterEach(() => { window.history.replaceState({}, '', '/'); });

  it('renders hero, wall, drawer, and deck bar', () => {
    mountApp(document.querySelector('#app')!);
    expect(document.querySelector('.hero')).not.toBeNull();
    expect(document.querySelector('.wall')).not.toBeNull();
    expect(document.querySelector('.drawer')).not.toBeNull();
    expect(document.querySelector('.deck')).not.toBeNull();
  });

  it('opens the drawer when a tile is clicked', () => {
    mountApp(document.querySelector('#app')!);
    (document.querySelector('.tile') as HTMLButtonElement).click();
    expect(document.querySelector('.drawer')!.getAttribute('aria-hidden')).toBe('false');
  });

  it('plays a track (mounts deck iframe) when a drawer row is clicked', () => {
    mountApp(document.querySelector('#app')!);
    (document.querySelector('.tile') as HTMLButtonElement).click();
    (document.querySelector('.drawer__row') as HTMLButtonElement).click();
    expect(document.querySelector('.deck iframe')).not.toBeNull();
  });

  it('renders the footer, a deck tip button, and the donate modal', () => {
    mountApp(document.querySelector('#app')!);
    expect(document.querySelector('.site-footer')).not.toBeNull();
    expect(document.querySelector('.deck .tip-button')).not.toBeNull();
    expect(document.querySelector('.donate')).not.toBeNull();
  });

  it('Shuffle all starts playback (mounts the deck iframe)', () => {
    mountApp(document.querySelector('#app')!);
    (document.querySelector('[data-action="shuffle"]') as HTMLButtonElement).click();
    expect(document.querySelector('.deck iframe')).not.toBeNull();
  });

  it('wraps the wall + filter in a <main> landmark and renders a skip link', () => {
    mountApp(document.querySelector('#app')!);
    expect(document.querySelector('main#main .wall')).not.toBeNull();
    expect(document.querySelector('main#main .filter')).not.toBeNull();
    expect(document.querySelector('a.skip-link')).not.toBeNull();
  });

  it('shows the tip-thanks toast when returning from a successful tip', () => {
    window.history.replaceState({}, '', '/?tip=success');
    mountApp(document.querySelector('#app')!);
    expect(document.querySelector('.tip-toast')).not.toBeNull();
  });

  it('auto-plays a shared now-playing track from ?a=&t=', () => {
    window.history.replaceState({}, '', '/?a=martin-garrix&t=0');
    mountApp(document.querySelector('#app')!);
    expect(document.querySelector('.deck__title')?.textContent).toContain('Martin Garrix');
  });
});
