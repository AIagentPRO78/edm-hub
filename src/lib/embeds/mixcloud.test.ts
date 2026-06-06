// src/lib/embeds/mixcloud.test.ts
import { describe, it, expect } from 'vitest';
import { mixcloudEmbedSrc } from './mixcloud';

describe('mixcloudEmbedSrc', () => {
  it('points at the mixcloud widget iframe host', () => {
    const src = mixcloudEmbedSrc('https://www.mixcloud.com/AboveandBeyond/group-therapy-500/');
    expect(src.startsWith('https://www.mixcloud.com/widget/iframe/?')).toBe(true);
  });
  it('url-encodes the cloudcast url into the feed param', () => {
    const src = mixcloudEmbedSrc('https://www.mixcloud.com/a/b/');
    expect(src.includes('feed=https%3A%2F%2Fwww.mixcloud.com%2Fa%2Fb%2F')).toBe(true);
  });
  it('autoplays by default', () => {
    expect(mixcloudEmbedSrc('https://www.mixcloud.com/a/b/').includes('autoplay=1')).toBe(true);
  });
});
