// src/lib/embeds/soundcloud.test.ts
import { describe, it, expect } from 'vitest';
import { soundcloudEmbedSrc } from './soundcloud';

describe('soundcloudEmbedSrc', () => {
  it('points at the soundcloud widget host', () => {
    const src = soundcloudEmbedSrc('https://soundcloud.com/arminvanbuuren/communication');
    expect(src.startsWith('https://w.soundcloud.com/player/?')).toBe(true);
  });
  it('url-encodes the track url into the url param', () => {
    const src = soundcloudEmbedSrc('https://soundcloud.com/a/b');
    expect(src.includes('url=https%3A%2F%2Fsoundcloud.com%2Fa%2Fb')).toBe(true);
  });
  it('auto-plays by default', () => {
    expect(soundcloudEmbedSrc('https://soundcloud.com/a/b').includes('auto_play=true')).toBe(true);
  });
});
