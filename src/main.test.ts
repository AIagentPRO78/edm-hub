// src/main.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { mountApp } from './main';

describe('mountApp', () => {
  beforeEach(() => { document.body.innerHTML = '<div id="app"></div>'; });

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
});
