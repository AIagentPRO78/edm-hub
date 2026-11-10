// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

// public/sw.js is a classic worker script, not a module, so it is evaluated
// here against fakes for the worker globals it touches.
const SW_SOURCE = readFileSync(resolve(process.cwd(), 'public/sw.js'), 'utf-8');
const ORIGIN = 'https://djset.club';

interface FakeResponse {
  ok: boolean;
  type: string;
  headers: { get(name: string): string | null };
  clone(): FakeResponse;
  label: string;
}

function response(label: string, init: { ok?: boolean; type?: string; contentType?: string | null } = {}): FakeResponse {
  const contentType = init.contentType === undefined ? 'text/html; charset=utf-8' : init.contentType;
  const res: FakeResponse = {
    ok: init.ok ?? true,
    type: init.type ?? 'basic',
    headers: { get: (name) => (name.toLowerCase() === 'content-type' ? contentType : null) },
    clone: () => ({ ...res, label: `${label} (copy)` }),
    label,
  };
  return res;
}

type FetchListener = (event: { request: unknown; respondWith(p: Promise<unknown>): void }) => void;

function loadWorker(fetchImpl: () => Promise<FakeResponse>) {
  const listeners = new Map<string, FetchListener>();
  const store = new Map<string, FakeResponse>();
  const put = vi.fn((key: unknown, res: FakeResponse) => {
    store.set(typeof key === 'string' ? key : (key as { url: string }).url, res);
    return Promise.resolve();
  });
  const self = {
    location: { origin: ORIGIN },
    addEventListener: (type: string, cb: FetchListener) => listeners.set(type, cb),
    skipWaiting: () => Promise.resolve(),
    clients: { claim: () => Promise.resolve() },
  };
  const caches = {
    open: () => Promise.resolve({ put, addAll: () => Promise.resolve() }),
    keys: () => Promise.resolve([]),
    delete: () => Promise.resolve(true),
    match: (key: unknown) =>
      Promise.resolve(store.get(typeof key === 'string' ? key : (key as { url: string }).url)),
  };
  const fetchMock = vi.fn(fetchImpl);
  const error = { label: 'network error' };
  new Function('self', 'caches', 'fetch', 'Response', SW_SOURCE)(self, caches, fetchMock, { error: () => error });

  async function navigate(path: string): Promise<unknown> {
    let responded: Promise<unknown> | undefined;
    listeners.get('fetch')!({
      request: { method: 'GET', mode: 'navigate', url: `${ORIGIN}${path}` },
      respondWith: (p) => { responded = p; },
    });
    const result = await responded;
    await new Promise((r) => setTimeout(r, 0)); // let the cache write settle
    return result;
  }

  return { navigate, put, store, error };
}

describe('service worker: offline shell', () => {
  beforeEach(() => vi.restoreAllMocks());

  it.each(['/', '/?artist=tiesto&track=3', '/?tip=success'])('stores the HTML for %s as the shell', async (path) => {
    const res = response('index');
    const sw = loadWorker(() => Promise.resolve(res));
    expect(await sw.navigate(path)).toBe(res);
    expect(sw.put).toHaveBeenCalledTimes(1);
    expect(sw.put.mock.calls[0]?.[0]).toBe('/');
  });

  it.each([
    ['/robots.txt', 'text/plain'],
    ['/sitemap.xml', 'application/xml'],
    ['/og.jpg', 'image/jpeg'],
    ['/assets/index-abc123.js', 'text/javascript'],
    ['/google111b7348b9ec05ef.html', 'text/html'],
  ])('does not let a navigation to %s replace the shell', async (path, contentType) => {
    const res = response(path, { contentType });
    const sw = loadWorker(() => Promise.resolve(res));
    expect(await sw.navigate(path)).toBe(res); // still passed through to the page
    expect(sw.put).not.toHaveBeenCalled();
  });

  it.each([
    ['a failed response', { ok: false }],
    ['a non-HTML response', { contentType: 'text/plain' }],
    ['a response with no content type', { contentType: null }],
    ['an opaque response', { type: 'opaque' }],
    ['a redirect', { ok: false, type: 'opaqueredirect' }],
  ])('does not store %s for / as the shell', async (_label, init) => {
    const sw = loadWorker(() => Promise.resolve(response('bad', init)));
    await sw.navigate('/');
    expect(sw.put).not.toHaveBeenCalled();
  });

  it('serves the cached shell for any navigation while offline', async () => {
    const shell = response('cached shell');
    const sw = loadWorker(() => Promise.reject(new Error('offline')));
    sw.store.set('/', shell);
    expect(await sw.navigate('/')).toBe(shell);
    expect(await sw.navigate('/robots.txt')).toBe(shell);
  });

  it('keeps the real shell after visiting another URL and then going offline', async () => {
    let online = true;
    const index = response('index');
    const sw = loadWorker(() => (online ? Promise.resolve(index) : Promise.reject(new Error('offline'))));
    await sw.navigate('/');
    const cached = sw.store.get('/');
    await sw.navigate('/robots.txt');
    online = false;
    expect(await sw.navigate('/')).toBe(cached);
  });

  it('returns a network error when offline with nothing cached', async () => {
    const sw = loadWorker(() => Promise.reject(new Error('offline')));
    expect(await sw.navigate('/')).toBe(sw.error);
  });
});
