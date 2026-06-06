// src/lib/embeds/youtube.test.ts
import { describe, it, expect } from 'vitest';
import { youtubeEmbedSrc } from './youtube';

describe('youtubeEmbedSrc', () => {
  it('uses the privacy-enhanced domain and the video id path', () => {
    const src = youtubeEmbedSrc('_ovdm2yX4MA');
    expect(src.startsWith('https://www.youtube-nocookie.com/embed/_ovdm2yX4MA?')).toBe(true);
  });
  it('autoplays by default', () => {
    expect(youtubeEmbedSrc('abc').includes('autoplay=1')).toBe(true);
  });
  it('can disable autoplay', () => {
    expect(youtubeEmbedSrc('abc', false).includes('autoplay=0')).toBe(true);
  });
});
