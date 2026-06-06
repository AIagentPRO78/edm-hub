// src/lib/embeds/index.test.ts
import { describe, it, expect } from 'vitest';
import { embedSrc } from './index';
import type { Track } from '../../types';

const yt: Track = { title: 'Animals', platform: 'youtube', ref: 'abc123', kind: 'track' };
const sc: Track = { title: 'x', platform: 'soundcloud', ref: 'https://soundcloud.com/a/b', kind: 'track' };
const mc: Track = { title: 'ASOT', platform: 'mixcloud', ref: 'https://www.mixcloud.com/a/b/', kind: 'set' };

describe('embedSrc', () => {
  it('routes youtube tracks to the nocookie embed', () => {
    expect(embedSrc(yt).includes('youtube-nocookie.com')).toBe(true);
  });
  it('routes soundcloud tracks to the soundcloud widget', () => {
    expect(embedSrc(sc).includes('w.soundcloud.com')).toBe(true);
  });
  it('routes mixcloud tracks to the mixcloud widget', () => {
    expect(embedSrc(mc).includes('mixcloud.com/widget')).toBe(true);
  });
});
