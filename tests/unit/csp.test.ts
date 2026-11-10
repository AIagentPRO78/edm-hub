// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const read = (path: string): string => readFileSync(resolve(process.cwd(), path), 'utf-8');

function directives(): Map<string, string[]> {
  const config = JSON.parse(read('vercel.json')) as {
    headers: Array<{ source: string; headers: Array<{ key: string; value: string }> }>;
  };
  const csp = config.headers
    .flatMap((h) => h.headers)
    .find((h) => h.key === 'Content-Security-Policy')!.value;
  return new Map(
    csp.split(';').map((d) => {
      const [name, ...sources] = d.trim().split(/\s+/);
      return [name!, sources] as [string, string[]];
    }),
  );
}

/** CSP source matching: no path allows the whole host, a path ending in "/" is a prefix, any other path is exact. */
function allows(sources: string[], url: string): boolean {
  const target = new URL(url);
  return sources
    .filter((s) => s.startsWith('https:'))
    .some((s) => {
      const source = new URL(s);
      if (source.origin !== target.origin) return false;
      if (source.pathname === '/') return true;
      return s.endsWith('/') ? target.pathname.startsWith(source.pathname) : target.pathname === source.pathname;
    });
}

describe('Content-Security-Policy in vercel.json', () => {
  it("restricts form submissions to the site's own origin", () => {
    expect(directives().get('form-action')).toEqual(["'self'"]);
  });

  it('allows every player script src/lib/playback.ts loads', () => {
    const loaded = [...read('src/lib/playback.ts').matchAll(/const \w+_API = '(https:[^']+)'/g)].map((m) => m[1]!);
    expect(loaded).toHaveLength(3); // YouTube, SoundCloud, Mixcloud
    const scriptSrc = directives().get('script-src')!;
    for (const url of loaded) expect(allows(scriptSrc, url), url).toBe(true);
    // The YouTube loader then injects its widget script from /s/player/<build>/.
    expect(allows(scriptSrc, 'https://www.youtube.com/s/player/0004de42/www-widgetapi.vflset/www-widgetapi.js')).toBe(true);
  });

  it('does not allow scripts from a whole third-party host', () => {
    const scriptSrc = directives().get('script-src')!;
    for (const s of scriptSrc.filter((x) => x.startsWith('https:'))) {
      expect(new URL(s).pathname, s).not.toBe('/');
    }
    expect(allows(scriptSrc, 'https://www.youtube.com/anything-else?callback=x')).toBe(false);
  });

  it('still allows the three player iframes', () => {
    expect(directives().get('frame-src')).toEqual([
      'https://www.youtube-nocookie.com',
      'https://w.soundcloud.com',
      'https://www.mixcloud.com',
    ]);
  });
});
