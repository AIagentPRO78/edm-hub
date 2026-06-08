import { describe, it, expect } from 'vitest';
import { avatarSrc } from './image';

describe('avatarSrc', () => {
  it('downsizes a googleusercontent s400 avatar to s360', () => {
    expect(avatarSrc('https://yt3.googleusercontent.com/abc=s400-c-k-c0x00ffffff-no-rj')).toBe(
      'https://yt3.googleusercontent.com/abc=s360-c-k-c0x00ffffff-no-rj'
    );
  });

  it('rewrites any size segment, not just s400', () => {
    expect(avatarSrc('https://x/y=s1600-c-k')).toBe('https://x/y=s360-c-k');
  });

  it('is idempotent once already at s360', () => {
    expect(avatarSrc('https://x/y=s360-c-k')).toBe('https://x/y=s360-c-k');
  });

  it('leaves URLs without a size segment unchanged', () => {
    expect(avatarSrc('https://x/photo.jpg')).toBe('https://x/photo.jpg');
  });
});
