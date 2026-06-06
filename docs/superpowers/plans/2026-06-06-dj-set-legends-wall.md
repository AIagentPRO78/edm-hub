# DJ SET — The Legends Wall Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page neon-rave website where a wall of ~38 famous EDM/Trance DJs each plays their real music in-page via embedded official players, with a persistent now-playing deck bar.

**Architecture:** Static single-page app, no backend. Vite + vanilla TypeScript, CSS custom-property tokens. A tiny observable `player` store holds "what's playing"; per-platform embed adapters turn a track ref into an iframe `src`; the deck bar's iframe lives in a fixed element that is never destroyed, so music keeps playing while you browse. Deployed to Vercel as static output with a strict CSP.

**Tech Stack:** Vite, TypeScript, Vitest (unit), Playwright (visual + smoke), Vercel (host). No UI framework.

---

## File Structure

```
edm-hub/
├── index.html                      # app shell + root + module script
├── package.json
├── tsconfig.json
├── vite.config.ts
├── vercel.json                     # static output + CSP/security headers
├── playwright.config.ts
├── src/
│   ├── main.ts                     # bootstraps + wires components to player
│   ├── types.ts                    # Platform, Track, Artist
│   ├── data/
│   │   ├── artists.seed.json       # verified roster (from the harvest swarm)
│   │   └── artists.ts              # imports seed, assigns accents, validates
│   ├── lib/
│   │   ├── player.ts               # observable now-playing store
│   │   └── embeds/
│   │       ├── index.ts            # embedSrc(track) dispatcher
│   │       ├── youtube.ts
│   │       ├── soundcloud.ts
│   │       └── mixcloud.ts
│   ├── components/
│   │   ├── hero/hero.ts            # big DJ SET logo + Start/Shuffle CTAs
│   │   ├── wall/wall.ts            # grid
│   │   ├── wall/tile.ts            # single artist tile
│   │   ├── artist-drawer/drawer.ts # per-artist track picker
│   │   └── deck-bar/deck-bar.ts    # persistent player + transport
│   └── styles/
│       ├── tokens.css              # neon palette, type scale, spacing, easings
│       └── global.css
└── tests/
    ├── unit/                       # vitest specs live next to or under here
    └── e2e/
        ├── visual.spec.ts
        └── smoke.spec.ts
```

**Accent palette (used by `data/artists.ts`, deterministic by index):**
`['#ff2bd6','#19f0ff','#b14bff','#ff5ab1','#2bff9e','#ffd23d','#ff7a3d','#5a8cff']`

---

## Task 1: Scaffold the Vite + TypeScript project

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `src/main.ts`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "dj-set-legends-wall",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview --port 4173",
    "test": "vitest run",
    "test:watch": "vitest",
    "e2e": "playwright test"
  },
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^6.0.0",
    "vitest": "^2.1.0",
    "@playwright/test": "^1.48.0",
    "jsdom": "^25.0.0"
  }
}
```

- [ ] **Step 2: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "resolveJsonModule": true,
    "verbatimModuleSyntax": true,
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "types": ["vite/client", "vitest/globals"],
    "skipLibCheck": true,
    "noEmit": true
  },
  "include": ["src", "tests"]
}
```

- [ ] **Step 3: Create `vite.config.ts`**

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    include: ['src/**/*.test.ts'],
  },
});
```

- [ ] **Step 4: Create `index.html`**

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>DJ SET — The Legends Wall</title>
    <meta name="description" content="The world's EDM and Trance legends on one neon wall. Press play." />
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

- [ ] **Step 5: Create a placeholder `src/main.ts`**

```ts
const app = document.querySelector<HTMLDivElement>('#app');
if (app) app.textContent = 'DJ SET — booting…';
```

- [ ] **Step 6: Install and verify dev server boots**

Run: `cd ~/edm-hub && npm install && npm run build`
Expected: install completes; `vite build` emits `dist/` with no TS errors.

- [ ] **Step 7: Commit**

```bash
git add package.json tsconfig.json vite.config.ts index.html src/main.ts package-lock.json
git commit -m "chore: scaffold vite + typescript project"
```

---

## Task 2: Domain types

**Files:**
- Create: `src/types.ts`
- Test: `src/types.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/types.test.ts
import { describe, it, expect } from 'vitest';
import { isArtist } from './types';

describe('isArtist', () => {
  it('accepts a well-formed artist', () => {
    const a = {
      id: 'armin-van-buuren', name: 'Armin van Buuren', genres: ['Trance'],
      accent: '#ff2bd6',
      tracks: [{ title: 'Communication', platform: 'soundcloud', ref: 'https://soundcloud.com/x/y', kind: 'track' }],
    };
    expect(isArtist(a)).toBe(true);
  });

  it('rejects an artist with no tracks array', () => {
    expect(isArtist({ id: 'x', name: 'X', genres: [], accent: '#fff' })).toBe(false);
  });

  it('rejects a track with an unknown platform', () => {
    const a = {
      id: 'x', name: 'X', genres: [], accent: '#fff',
      tracks: [{ title: 't', platform: 'bandcamp', ref: 'r', kind: 'track' }],
    };
    expect(isArtist(a)).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/types.test.ts`
Expected: FAIL — `isArtist` is not exported.

- [ ] **Step 3: Write `src/types.ts`**

```ts
export type Platform = 'soundcloud' | 'youtube' | 'mixcloud';
export type TrackKind = 'track' | 'set';

export interface Track {
  title: string;
  platform: Platform;
  /** youtube=11-char video id; soundcloud/mixcloud=full permalink URL */
  ref: string;
  kind: TrackKind;
}

export interface Artist {
  id: string;
  name: string;
  genres: string[];
  /** neon hex used for the tile glow */
  accent: string;
  tracks: Track[];
}

const PLATFORMS: ReadonlySet<string> = new Set(['soundcloud', 'youtube', 'mixcloud']);
const KINDS: ReadonlySet<string> = new Set(['track', 'set']);

function isTrack(v: unknown): v is Track {
  if (typeof v !== 'object' || v === null) return false;
  const t = v as Record<string, unknown>;
  return (
    typeof t.title === 'string' &&
    typeof t.ref === 'string' &&
    typeof t.platform === 'string' && PLATFORMS.has(t.platform) &&
    typeof t.kind === 'string' && KINDS.has(t.kind)
  );
}

export function isArtist(v: unknown): v is Artist {
  if (typeof v !== 'object' || v === null) return false;
  const a = v as Record<string, unknown>;
  return (
    typeof a.id === 'string' &&
    typeof a.name === 'string' &&
    typeof a.accent === 'string' &&
    Array.isArray(a.genres) && a.genres.every((g) => typeof g === 'string') &&
    Array.isArray(a.tracks) && a.tracks.every(isTrack)
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/types.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/types.test.ts
git commit -m "feat: add domain types and artist validator"
```

---

## Task 3: YouTube embed adapter

**Files:**
- Create: `src/lib/embeds/youtube.ts`
- Test: `src/lib/embeds/youtube.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/embeds/youtube.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/lib/embeds/youtube.ts`**

```ts
export function youtubeEmbedSrc(ref: string, autoplay = true): string {
  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
  });
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(ref)}?${params.toString()}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/embeds/youtube.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/embeds/youtube.ts src/lib/embeds/youtube.test.ts
git commit -m "feat: add youtube embed adapter"
```

---

## Task 4: SoundCloud embed adapter

**Files:**
- Create: `src/lib/embeds/soundcloud.ts`
- Test: `src/lib/embeds/soundcloud.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/embeds/soundcloud.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/lib/embeds/soundcloud.ts`**

```ts
export function soundcloudEmbedSrc(ref: string, autoplay = true): string {
  const params = new URLSearchParams({
    url: ref,
    auto_play: autoplay ? 'true' : 'false',
    hide_related: 'true',
    show_comments: 'false',
    show_user: 'true',
    show_reposts: 'false',
    visual: 'false',
    color: 'ff2bd6',
  });
  return `https://w.soundcloud.com/player/?${params.toString()}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/embeds/soundcloud.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/embeds/soundcloud.ts src/lib/embeds/soundcloud.test.ts
git commit -m "feat: add soundcloud embed adapter"
```

---

## Task 5: Mixcloud embed adapter

**Files:**
- Create: `src/lib/embeds/mixcloud.ts`
- Test: `src/lib/embeds/mixcloud.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/embeds/mixcloud.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/lib/embeds/mixcloud.ts`**

```ts
export function mixcloudEmbedSrc(ref: string, autoplay = true): string {
  const params = new URLSearchParams({
    feed: ref,
    hide_cover: '1',
    light: '0',
    autoplay: autoplay ? '1' : '0',
  });
  return `https://www.mixcloud.com/widget/iframe/?${params.toString()}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/embeds/mixcloud.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/embeds/mixcloud.ts src/lib/embeds/mixcloud.test.ts
git commit -m "feat: add mixcloud embed adapter"
```

---

## Task 6: Embed dispatcher

**Files:**
- Create: `src/lib/embeds/index.ts`
- Test: `src/lib/embeds/index.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/embeds/index.test.ts`
Expected: FAIL — `embedSrc` not found.

- [ ] **Step 3: Write `src/lib/embeds/index.ts`**

```ts
import type { Track } from '../../types';
import { youtubeEmbedSrc } from './youtube';
import { soundcloudEmbedSrc } from './soundcloud';
import { mixcloudEmbedSrc } from './mixcloud';

export function embedSrc(track: Track, autoplay = true): string {
  switch (track.platform) {
    case 'youtube':
      return youtubeEmbedSrc(track.ref, autoplay);
    case 'soundcloud':
      return soundcloudEmbedSrc(track.ref, autoplay);
    case 'mixcloud':
      return mixcloudEmbedSrc(track.ref, autoplay);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/embeds/index.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/embeds/index.ts src/lib/embeds/index.test.ts
git commit -m "feat: add embed dispatcher"
```

---

## Task 7: The player store

**Files:**
- Create: `src/lib/player.ts`
- Test: `src/lib/player.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/lib/player.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createPlayer } from './player';
import type { Artist, Track } from '../types';

const track: Track = { title: 'Strobe', platform: 'youtube', ref: 'abc', kind: 'track' };
const artist: Artist = { id: 'deadmau5', name: 'deadmau5', genres: ['Progressive House'], accent: '#19f0ff', tracks: [track] };

describe('createPlayer', () => {
  it('starts with nothing playing', () => {
    const p = createPlayer();
    expect(p.state.track).toBeNull();
    expect(p.state.artist).toBeNull();
  });

  it('notifies subscribers immediately and on play', () => {
    const p = createPlayer();
    const seen = vi.fn();
    p.subscribe(seen);
    expect(seen).toHaveBeenCalledTimes(1); // initial emit
    p.play(artist, track);
    expect(seen).toHaveBeenCalledTimes(2);
    expect(p.state.track).toEqual(track);
    expect(p.state.artist).toEqual(artist);
  });

  it('stops notifying after unsubscribe', () => {
    const p = createPlayer();
    const seen = vi.fn();
    const off = p.subscribe(seen);
    off();
    p.play(artist, track);
    expect(seen).toHaveBeenCalledTimes(1); // only the initial emit
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/lib/player.test.ts`
Expected: FAIL — `createPlayer` not found.

- [ ] **Step 3: Write `src/lib/player.ts`**

```ts
import type { Artist, Track } from '../types';

export interface PlayerState {
  artist: Artist | null;
  track: Track | null;
}

type Listener = (state: PlayerState) => void;

export function createPlayer() {
  let state: PlayerState = { artist: null, track: null };
  const listeners = new Set<Listener>();

  const emit = () => {
    for (const l of listeners) l(state);
  };

  return {
    get state(): PlayerState {
      return state;
    },
    subscribe(listener: Listener): () => void {
      listeners.add(listener);
      listener(state);
      return () => {
        listeners.delete(listener);
      };
    },
    play(artist: Artist, track: Track): void {
      state = { artist, track };
      emit();
    },
    clear(): void {
      state = { artist: null, track: null };
      emit();
    },
  };
}

export type Player = ReturnType<typeof createPlayer>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/lib/player.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/lib/player.ts src/lib/player.test.ts
git commit -m "feat: add observable player store"
```

---

## Task 8: Roster data module

**Note:** `src/data/artists.seed.json` is produced by the embed-harvest swarm
(workflow `dj-set-embed-harvest`). Its shape is an array of objects:
`{ id, name, genres, tracks: [{ title, platform, ref, sourceUrl, kind, verified }], notes }`.
This task drops in that file, then builds `artists.ts` which strips unverified
tracks, assigns a neon `accent` by index, and validates. Any artist left with
zero verified tracks is flagged at build time (logged, kept out of the wall).

**Files:**
- Create: `src/data/artists.seed.json` (from the swarm output)
- Create: `src/data/artists.ts`
- Test: `src/data/artists.test.ts`

- [ ] **Step 1: Place the seed file**

Copy the swarm's verified output to `src/data/artists.seed.json`. If the swarm
has not finished, create a minimal 2-artist stub with the same shape so the
module compiles, and replace it later:

```json
[
  { "id": "armin-van-buuren", "name": "Armin van Buuren", "genres": ["Trance"],
    "notes": "",
    "tracks": [
      { "title": "Communication", "platform": "soundcloud",
        "ref": "https://soundcloud.com/arminvanbuuren/communication-part-3",
        "sourceUrl": "https://soundcloud.com/arminvanbuuren/communication-part-3",
        "kind": "track", "verified": true }
    ] },
  { "id": "martin-garrix", "name": "Martin Garrix", "genres": ["Big Room"],
    "notes": "",
    "tracks": [
      { "title": "Animals", "platform": "youtube", "ref": "gCYcHz2k5x0",
        "sourceUrl": "https://www.youtube.com/watch?v=gCYcHz2k5x0",
        "kind": "track", "verified": true }
    ] }
]
```

- [ ] **Step 2: Write the failing test**

```ts
// src/data/artists.test.ts
import { describe, it, expect } from 'vitest';
import { ARTISTS } from './artists';
import { isArtist } from '../types';

describe('ARTISTS', () => {
  it('is non-empty and every entry is a valid Artist', () => {
    expect(ARTISTS.length).toBeGreaterThan(0);
    for (const a of ARTISTS) expect(isArtist(a)).toBe(true);
  });

  it('every artist has at least one playable track', () => {
    for (const a of ARTISTS) expect(a.tracks.length).toBeGreaterThan(0);
  });

  it('assigns a non-empty accent to every artist', () => {
    for (const a of ARTISTS) expect(a.accent).toMatch(/^#[0-9a-fA-F]{6}$/);
  });

  it('exposes only verified track refs (no sourceUrl/verified leakage in the Track shape)', () => {
    for (const a of ARTISTS) {
      for (const t of a.tracks) {
        expect(Object.keys(t).sort()).toEqual(['kind', 'platform', 'ref', 'title']);
      }
    }
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `npx vitest run src/data/artists.test.ts`
Expected: FAIL — `./artists` not found.

- [ ] **Step 4: Write `src/data/artists.ts`**

```ts
import type { Artist, Track } from '../types';
import seed from './artists.seed.json';

const ACCENTS = ['#ff2bd6', '#19f0ff', '#b14bff', '#ff5ab1', '#2bff9e', '#ffd23d', '#ff7a3d', '#5a8cff'] as const;

interface SeedTrack {
  title: string;
  platform: string;
  ref: string;
  sourceUrl: string;
  kind: string;
  verified: boolean;
}
interface SeedArtist {
  id: string;
  name: string;
  genres: string[];
  tracks: SeedTrack[];
  notes: string;
}

const PLATFORMS = new Set(['soundcloud', 'youtube', 'mixcloud']);
const KINDS = new Set(['track', 'set']);

function toTrack(s: SeedTrack): Track | null {
  if (!s.verified) return null;
  if (!PLATFORMS.has(s.platform) || !KINDS.has(s.kind)) return null;
  return {
    title: s.title,
    platform: s.platform as Track['platform'],
    ref: s.ref,
    kind: s.kind as Track['kind'],
  };
}

export const ARTISTS: Artist[] = (seed as SeedArtist[])
  .map((s, i): Artist => ({
    id: s.id,
    name: s.name,
    genres: s.genres,
    accent: ACCENTS[i % ACCENTS.length]!,
    tracks: s.tracks.map(toTrack).filter((t): t is Track => t !== null),
  }))
  .filter((a) => {
    if (a.tracks.length === 0) {
      // eslint-disable-next-line no-console
      console.warn(`[artists] dropping "${a.id}" — no verified tracks`);
      return false;
    }
    return true;
  });
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/data/artists.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/data/artists.seed.json src/data/artists.ts src/data/artists.test.ts
git commit -m "feat: add roster data module with accent assignment and verified-track filtering"
```

---

## Task 9: Design tokens + global styles

**Files:**
- Create: `src/styles/tokens.css`, `src/styles/global.css`

- [ ] **Step 1: Write `src/styles/tokens.css`**

```css
:root {
  /* neon palette */
  --bg: #07060f;
  --bg-raise: #0e0a1c;
  --magenta: #ff2bd6;
  --cyan: #19f0ff;
  --violet: #b14bff;
  --text: #f3f0ff;
  --text-dim: #9a8fb5;
  --text-faint: #5e5775;

  /* type scale */
  --text-base: clamp(1rem, 0.92rem + 0.4vw, 1.125rem);
  --text-logo: clamp(3rem, 1rem + 11vw, 9rem);

  /* spacing + rhythm */
  --space-section: clamp(3rem, 2rem + 5vw, 7rem);
  --gap-wall: clamp(0.5rem, 0.3rem + 0.6vw, 0.85rem);
  --deck-h: 76px;

  /* motion */
  --dur-fast: 150ms;
  --dur-normal: 320ms;
  --ease-out-expo: cubic-bezier(0.16, 1, 0.3, 1);
}
```

- [ ] **Step 2: Write `src/styles/global.css`**

```css
@import './tokens.css';

* { box-sizing: border-box; }

html, body { margin: 0; padding: 0; }

body {
  background: var(--bg);
  color: var(--text);
  font-family: system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif;
  font-size: var(--text-base);
  /* leave room for the fixed deck bar */
  padding-bottom: var(--deck-h);
  min-height: 100dvh;
}

a { color: inherit; }

:focus-visible {
  outline: 2px solid var(--cyan);
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.001ms !important;
    transition-duration: 0.001ms !important;
  }
}
```

- [ ] **Step 3: Import global styles in `src/main.ts`** (replace the placeholder body)

```ts
import './styles/global.css';

const app = document.querySelector<HTMLDivElement>('#app');
if (app) app.textContent = 'DJ SET — booting…';
```

- [ ] **Step 4: Verify build still passes**

Run: `npm run build`
Expected: PASS, no errors.

- [ ] **Step 5: Commit**

```bash
git add src/styles/tokens.css src/styles/global.css src/main.ts
git commit -m "feat: add neon design tokens and global styles"
```

---

## Task 10: Artist tile

**Files:**
- Create: `src/components/wall/tile.ts`, `src/components/wall/tile.css`
- Test: `src/components/wall/tile.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/components/wall/tile.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createTile } from './tile';
import type { Artist } from '../../types';

const artist: Artist = {
  id: 'tiesto', name: 'Tiësto', genres: ['Big Room'], accent: '#ff2bd6',
  tracks: [{ title: 'Red Lights', platform: 'youtube', ref: 'abc', kind: 'track' }],
};

describe('createTile', () => {
  it('renders the artist name and is a button for a11y', () => {
    const el = createTile(artist, () => {});
    expect(el.tagName).toBe('BUTTON');
    expect(el.textContent).toContain('Tiësto');
  });
  it('applies the accent as a CSS custom property', () => {
    const el = createTile(artist, () => {});
    expect(el.style.getPropertyValue('--accent')).toBe('#ff2bd6');
  });
  it('invokes the callback with the artist on click', () => {
    const onSelect = vi.fn();
    const el = createTile(artist, onSelect);
    el.click();
    expect(onSelect).toHaveBeenCalledWith(artist);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/wall/tile.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/components/wall/tile.ts`**

```ts
import type { Artist } from '../../types';
import './tile.css';

export function createTile(artist: Artist, onSelect: (a: Artist) => void): HTMLButtonElement {
  const el = document.createElement('button');
  el.className = 'tile';
  el.style.setProperty('--accent', artist.accent);
  el.setAttribute('aria-label', `Play ${artist.name}`);
  el.dataset.artistId = artist.id;

  const name = document.createElement('span');
  name.className = 'tile__name';
  name.textContent = artist.name;

  const genre = document.createElement('span');
  genre.className = 'tile__genre';
  genre.textContent = artist.genres[0] ?? '';

  el.append(name, genre);
  el.addEventListener('click', () => onSelect(artist));
  return el;
}
```

- [ ] **Step 4: Write `src/components/wall/tile.css`**

```css
.tile {
  position: relative;
  aspect-ratio: 1;
  border-radius: 14px;
  border: 1px solid color-mix(in oklab, var(--accent) 55%, transparent);
  background: linear-gradient(155deg, var(--bg-raise), #0b0816);
  color: var(--text);
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  align-items: flex-start;
  gap: 0.15rem;
  cursor: pointer;
  text-align: left;
  box-shadow: 0 0 0 transparent;
  transition: transform var(--dur-fast) var(--ease-out-expo),
    box-shadow var(--dur-normal) var(--ease-out-expo);
}
.tile::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(circle at 70% 15%, color-mix(in oklab, var(--accent) 22%, transparent), transparent 60%);
  opacity: 0.6;
  pointer-events: none;
}
.tile:hover, .tile:focus-visible {
  transform: translateY(-4px);
  box-shadow: 0 0 22px color-mix(in oklab, var(--accent) 45%, transparent);
}
.tile[aria-current='true'] {
  box-shadow: 0 0 26px color-mix(in oklab, var(--accent) 60%, transparent);
  border-color: var(--accent);
}
.tile__name { font-weight: 800; font-size: 0.95rem; line-height: 1.1; }
.tile__genre { font-size: 0.65rem; letter-spacing: 0.18em; text-transform: uppercase; color: var(--text-faint); }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/wall/tile.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/wall/tile.ts src/components/wall/tile.css src/components/wall/tile.test.ts
git commit -m "feat: add artist tile component"
```

---

## Task 11: The wall

**Files:**
- Create: `src/components/wall/wall.ts`, `src/components/wall/wall.css`
- Test: `src/components/wall/wall.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/components/wall/wall.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createWall } from './wall';
import type { Artist } from '../../types';

const artists: Artist[] = [
  { id: 'a', name: 'A', genres: ['Trance'], accent: '#ff2bd6', tracks: [{ title: 't', platform: 'youtube', ref: 'x', kind: 'track' }] },
  { id: 'b', name: 'B', genres: ['Techno'], accent: '#19f0ff', tracks: [{ title: 't', platform: 'youtube', ref: 'y', kind: 'track' }] },
];

describe('createWall', () => {
  it('renders one tile per artist', () => {
    const el = createWall(artists, () => {});
    expect(el.querySelectorAll('.tile').length).toBe(2);
  });
  it('forwards tile selection', () => {
    const onSelect = vi.fn();
    const el = createWall(artists, onSelect);
    (el.querySelector('.tile') as HTMLButtonElement).click();
    expect(onSelect).toHaveBeenCalledWith(artists[0]);
  });
  it('marks the active artist with aria-current', () => {
    const el = createWall(artists, () => {});
    el.setActive('b');
    expect((el.querySelector('[data-artist-id="b"]') as HTMLElement).getAttribute('aria-current')).toBe('true');
    expect((el.querySelector('[data-artist-id="a"]') as HTMLElement).getAttribute('aria-current')).toBe('false');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/wall/wall.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/components/wall/wall.ts`**

```ts
import type { Artist } from '../../types';
import { createTile } from './tile';
import './wall.css';

export interface WallElement extends HTMLElement {
  setActive(artistId: string | null): void;
}

export function createWall(artists: Artist[], onSelect: (a: Artist) => void): WallElement {
  const section = document.createElement('section') as WallElement;
  section.className = 'wall';
  section.setAttribute('aria-label', 'The legends wall');

  const grid = document.createElement('div');
  grid.className = 'wall__grid';

  for (const artist of artists) grid.append(createTile(artist, onSelect));
  section.append(grid);

  section.setActive = (artistId: string | null) => {
    for (const tile of grid.querySelectorAll<HTMLElement>('.tile')) {
      tile.setAttribute('aria-current', tile.dataset.artistId === artistId ? 'true' : 'false');
    }
  };

  return section;
}
```

- [ ] **Step 4: Write `src/components/wall/wall.css`**

```css
.wall { padding: 0 clamp(1rem, 0.5rem + 3vw, 3rem) var(--space-section); }
.wall__grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: var(--gap-wall);
}
@media (max-width: 1024px) { .wall__grid { grid-template-columns: repeat(3, 1fr); } }
@media (max-width: 560px)  { .wall__grid { grid-template-columns: repeat(2, 1fr); } }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/wall/wall.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/wall/wall.ts src/components/wall/wall.css src/components/wall/wall.test.ts
git commit -m "feat: add legends wall grid"
```

---

## Task 12: Artist drawer (track picker)

**Files:**
- Create: `src/components/artist-drawer/drawer.ts`, `src/components/artist-drawer/drawer.css`
- Test: `src/components/artist-drawer/drawer.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/components/artist-drawer/drawer.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createArtistDrawer } from './drawer';
import type { Artist, Track } from '../../types';

const artist: Artist = {
  id: 'armin', name: 'Armin van Buuren', genres: ['Trance'], accent: '#ff2bd6',
  tracks: [
    { title: 'Communication', platform: 'soundcloud', ref: 'https://soundcloud.com/a/b', kind: 'track' },
    { title: 'ASOT 1000', platform: 'mixcloud', ref: 'https://www.mixcloud.com/a/c/', kind: 'set' },
  ],
};

describe('createArtistDrawer', () => {
  it('is hidden until opened', () => {
    const d = createArtistDrawer(() => {});
    expect(d.el.getAttribute('aria-hidden')).toBe('true');
  });
  it('lists the artist tracks when opened', () => {
    const d = createArtistDrawer(() => {});
    d.open(artist);
    expect(d.el.getAttribute('aria-hidden')).toBe('false');
    expect(d.el.querySelectorAll('.drawer__row').length).toBe(2);
    expect(d.el.textContent).toContain('Communication');
  });
  it('emits the chosen track on row click', () => {
    const onPick = vi.fn<(a: Artist, t: Track) => void>();
    const d = createArtistDrawer(onPick);
    d.open(artist);
    (d.el.querySelector('.drawer__row') as HTMLButtonElement).click();
    expect(onPick).toHaveBeenCalledWith(artist, artist.tracks[0]);
  });
  it('hides again on close', () => {
    const d = createArtistDrawer(() => {});
    d.open(artist);
    d.close();
    expect(d.el.getAttribute('aria-hidden')).toBe('true');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/artist-drawer/drawer.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/components/artist-drawer/drawer.ts`**

```ts
import type { Artist, Track } from '../../types';
import './drawer.css';

export interface ArtistDrawer {
  el: HTMLElement;
  open(artist: Artist): void;
  close(): void;
}

const SOURCE_LABEL: Record<Track['platform'], string> = {
  soundcloud: 'SoundCloud',
  youtube: 'YouTube',
  mixcloud: 'Mixcloud',
};

export function createArtistDrawer(onPick: (artist: Artist, track: Track) => void): ArtistDrawer {
  const el = document.createElement('aside');
  el.className = 'drawer';
  el.setAttribute('aria-hidden', 'true');
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Artist tracks');

  const panel = document.createElement('div');
  panel.className = 'drawer__panel';
  el.append(panel);

  // click on the scrim closes
  el.addEventListener('click', (e) => {
    if (e.target === el) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') close();
  });

  function render(artist: Artist): void {
    panel.style.setProperty('--accent', artist.accent);
    panel.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'drawer__header';
    const h = document.createElement('h2');
    h.className = 'drawer__title';
    h.textContent = artist.name;
    const close = document.createElement('button');
    close.className = 'drawer__close';
    close.setAttribute('aria-label', 'Close');
    close.textContent = '✕';
    close.addEventListener('click', () => closeDrawer());
    header.append(h, close);
    panel.append(header);

    const list = document.createElement('div');
    list.className = 'drawer__list';
    for (const track of artist.tracks) {
      const row = document.createElement('button');
      row.className = 'drawer__row';
      const title = document.createElement('span');
      title.className = 'drawer__row-title';
      title.textContent = track.title;
      const badge = document.createElement('span');
      badge.className = 'drawer__badge';
      badge.textContent = `${SOURCE_LABEL[track.platform]} · ${track.kind}`;
      row.append(title, badge);
      row.addEventListener('click', () => onPick(artist, track));
      list.append(row);
    }
    panel.append(list);
  }

  function openDrawer(artist: Artist): void {
    render(artist);
    el.setAttribute('aria-hidden', 'false');
  }
  function closeDrawer(): void {
    el.setAttribute('aria-hidden', 'true');
  }
  const close = closeDrawer;

  return { el, open: openDrawer, close: closeDrawer };
}
```

- [ ] **Step 4: Write `src/components/artist-drawer/drawer.css`**

```css
.drawer {
  position: fixed;
  inset: 0;
  bottom: var(--deck-h);
  background: rgba(4, 3, 10, 0.55);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: flex-end;
  z-index: 40;
  opacity: 1;
  transition: opacity var(--dur-normal) var(--ease-out-expo);
}
.drawer[aria-hidden='true'] { opacity: 0; pointer-events: none; }
.drawer__panel {
  width: min(420px, 92vw);
  height: 100%;
  background: linear-gradient(160deg, var(--bg-raise), #08060f);
  border-left: 1px solid color-mix(in oklab, var(--accent) 55%, transparent);
  box-shadow: -12px 0 40px color-mix(in oklab, var(--accent) 25%, transparent);
  padding: 1.25rem;
  overflow-y: auto;
}
.drawer__header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 1rem; }
.drawer__title { margin: 0; font-size: 1.4rem; }
.drawer__close { background: none; border: none; color: var(--text-dim); font-size: 1.1rem; cursor: pointer; }
.drawer__list { display: flex; flex-direction: column; gap: 0.5rem; }
.drawer__row {
  display: flex; align-items: center; justify-content: space-between;
  gap: 0.75rem; width: 100%; text-align: left;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 10px; padding: 0.75rem 0.9rem; color: var(--text); cursor: pointer;
  transition: border-color var(--dur-fast), background var(--dur-fast);
}
.drawer__row:hover, .drawer__row:focus-visible {
  border-color: var(--accent);
  background: color-mix(in oklab, var(--accent) 12%, transparent);
}
.drawer__row-title { font-weight: 700; }
.drawer__badge { font-size: 0.65rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--text-faint); white-space: nowrap; }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/artist-drawer/drawer.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/artist-drawer/
git commit -m "feat: add artist drawer track picker"
```

---

## Task 13: Deck bar (persistent player)

**Files:**
- Create: `src/components/deck-bar/deck-bar.ts`, `src/components/deck-bar/deck-bar.css`
- Test: `src/components/deck-bar/deck-bar.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/components/deck-bar/deck-bar.test.ts
import { describe, it, expect } from 'vitest';
import { createDeckBar } from './deck-bar';
import { createPlayer } from '../../lib/player';
import type { Artist } from '../../types';

const artist: Artist = {
  id: 'garrix', name: 'Martin Garrix', genres: ['Big Room'], accent: '#ff2bd6',
  tracks: [{ title: 'Animals', platform: 'youtube', ref: 'gCYcHz2k5x0', kind: 'track' }],
};

describe('createDeckBar', () => {
  it('shows an idle state with no iframe before anything plays', () => {
    const player = createPlayer();
    const el = createDeckBar(player);
    expect(el.querySelector('iframe')).toBeNull();
    expect(el.textContent).toContain('Nothing playing');
  });

  it('mounts an iframe with the embed src when a track plays', () => {
    const player = createPlayer();
    const el = createDeckBar(player);
    player.play(artist, artist.tracks[0]!);
    const iframe = el.querySelector('iframe');
    expect(iframe).not.toBeNull();
    expect(iframe!.src).toContain('youtube-nocookie.com/embed/gCYcHz2k5x0');
    expect(el.textContent).toContain('Martin Garrix');
    expect(el.textContent).toContain('Animals');
  });

  it('reuses the same iframe element across track changes (keeps it alive)', () => {
    const player = createPlayer();
    const el = createDeckBar(player);
    player.play(artist, artist.tracks[0]!);
    const first = el.querySelector('iframe');
    player.play(artist, { title: 'Scared', platform: 'youtube', ref: 'abc123', kind: 'track' });
    const second = el.querySelector('iframe');
    expect(second).toBe(first); // same node, only src changed
    expect(second!.src).toContain('abc123');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/deck-bar/deck-bar.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/components/deck-bar/deck-bar.ts`**

```ts
import type { Player } from '../../lib/player';
import { embedSrc } from '../../lib/embeds';
import './deck-bar.css';

const SOURCE_LABEL = { soundcloud: 'SoundCloud', youtube: 'YouTube', mixcloud: 'Mixcloud' } as const;

export function createDeckBar(player: Player): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'deck';
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', 'Now playing');

  const meta = document.createElement('div');
  meta.className = 'deck__meta';

  const title = document.createElement('div');
  title.className = 'deck__title';
  title.textContent = 'Nothing playing';

  const sub = document.createElement('div');
  sub.className = 'deck__sub';
  sub.textContent = 'Pick an artist to start the set';

  meta.append(title, sub);

  // the player iframe is created ONCE and never removed — only its src changes,
  // so playback survives browsing/scrolling/drawer opens.
  const playerSlot = document.createElement('div');
  playerSlot.className = 'deck__player';
  let iframe: HTMLIFrameElement | null = null;

  bar.append(meta, playerSlot);

  player.subscribe(({ artist, track }) => {
    if (!artist || !track) {
      title.textContent = 'Nothing playing';
      sub.textContent = 'Pick an artist to start the set';
      return;
    }
    bar.style.setProperty('--accent', artist.accent);
    title.textContent = `${artist.name} — ${track.title}`;
    sub.textContent = `▶ now playing · via ${SOURCE_LABEL[track.platform]}`;

    if (!iframe) {
      iframe = document.createElement('iframe');
      iframe.className = 'deck__iframe';
      iframe.allow = 'autoplay; encrypted-media; fullscreen';
      iframe.setAttribute('loading', 'eager');
      playerSlot.append(iframe);
    }
    iframe.src = embedSrc(track, true);
  });

  return bar;
}
```

- [ ] **Step 4: Write `src/components/deck-bar/deck-bar.css`**

```css
.deck {
  position: fixed;
  left: 0; right: 0; bottom: 0;
  height: var(--deck-h);
  display: flex; align-items: center; gap: 1rem;
  padding: 0 clamp(0.75rem, 0.5rem + 1vw, 1.25rem);
  background: linear-gradient(90deg, #0c0a18, #120a1f);
  border-top: 1px solid color-mix(in oklab, var(--accent, var(--magenta)) 60%, transparent);
  box-shadow: 0 -4px 22px color-mix(in oklab, var(--accent, var(--magenta)) 22%, transparent);
  z-index: 60;
}
.deck__meta { min-width: 0; flex: 0 0 auto; max-width: 38vw; }
.deck__title { font-weight: 800; font-size: 0.9rem; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.deck__sub { font-size: 0.7rem; color: var(--cyan); }
.deck__player { flex: 1 1 auto; height: 100%; display: flex; align-items: center; }
.deck__iframe { width: 100%; height: 56px; border: 0; border-radius: 8px; }

@media (max-width: 560px) {
  .deck__meta { max-width: 46vw; }
  .deck__iframe { height: 48px; }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/deck-bar/deck-bar.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/deck-bar/
git commit -m "feat: add persistent deck bar player"
```

---

## Task 14: Hero

**Files:**
- Create: `src/components/hero/hero.ts`, `src/components/hero/hero.css`
- Test: `src/components/hero/hero.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/hero/hero.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write `src/components/hero/hero.ts`**

```ts
import './hero.css';

export interface HeroHandlers {
  onStart: () => void;
  onShuffle: () => void;
}

export function createHero({ onStart, onShuffle }: HeroHandlers): HTMLElement {
  const hero = document.createElement('header');
  hero.className = 'hero';

  hero.innerHTML = `
    <div class="hero__glow" aria-hidden="true"></div>
    <div class="hero__beams" aria-hidden="true"></div>
    <div class="hero__content">
      <p class="hero__eyebrow">THE WORLD'S</p>
      <h1 class="hero__logo">DJ&nbsp;SET</h1>
      <p class="hero__tagline">EDM · TRANCE · ONE WALL · PRESS PLAY</p>
      <div class="hero__cta">
        <button class="hero__btn hero__btn--primary" data-action="start">▶ Start the set</button>
        <button class="hero__btn hero__btn--ghost" data-action="shuffle">Shuffle all</button>
      </div>
    </div>
  `;

  hero.querySelector<HTMLButtonElement>('[data-action="start"]')!.addEventListener('click', onStart);
  hero.querySelector<HTMLButtonElement>('[data-action="shuffle"]')!.addEventListener('click', onShuffle);
  return hero;
}
```

- [ ] **Step 4: Write `src/components/hero/hero.css`**

```css
.hero {
  position: relative;
  min-height: 78vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  overflow: hidden;
  padding: var(--space-section) 1rem;
}
.hero__glow {
  position: absolute; inset: 0;
  background:
    radial-gradient(ellipse 70% 50% at 50% -5%, color-mix(in oklab, var(--magenta) 40%, transparent), transparent 60%),
    radial-gradient(ellipse 60% 45% at 50% 8%, color-mix(in oklab, var(--cyan) 28%, transparent), transparent 65%),
    radial-gradient(circle at 12% 95%, color-mix(in oklab, var(--magenta) 32%, transparent), transparent 45%),
    radial-gradient(circle at 90% 100%, color-mix(in oklab, var(--cyan) 30%, transparent), transparent 45%);
}
.hero__beams {
  position: absolute; top: -20px; left: 50%; width: 2px; height: 180px;
  background: linear-gradient(color-mix(in oklab, var(--magenta) 75%, transparent), transparent);
  transform: rotate(-18deg); transform-origin: top;
  box-shadow: 60px 0 color-mix(in oklab, var(--cyan) 60%, transparent);
}
.hero__content { position: relative; }
.hero__eyebrow { font-size: 0.75rem; letter-spacing: 0.55em; color: var(--violet); margin: 0 0 0.5rem; }
.hero__logo {
  margin: 0;
  font-size: var(--text-logo);
  font-style: italic;
  font-weight: 900;
  letter-spacing: 0.02em;
  line-height: 0.9;
  background: linear-gradient(180deg, #ffffff 0%, var(--cyan) 45%, var(--magenta) 100%);
  -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 0 14px color-mix(in oklab, var(--magenta) 55%, transparent))
          drop-shadow(0 0 30px color-mix(in oklab, var(--cyan) 40%, transparent));
}
.hero__tagline { margin: 0.75rem 0 0; font-size: 0.8rem; letter-spacing: 0.4em; color: var(--cyan); text-shadow: 0 0 8px color-mix(in oklab, var(--cyan) 60%, transparent); }
.hero__cta { display: flex; gap: 0.75rem; justify-content: center; margin-top: 1.5rem; }
.hero__btn { border-radius: 999px; padding: 0.7rem 1.4rem; font-weight: 700; cursor: pointer; font-size: 0.85rem; border: 1px solid transparent; }
.hero__btn--primary { color: #0b0813; background: linear-gradient(90deg, var(--cyan), var(--magenta)); box-shadow: 0 0 18px color-mix(in oklab, var(--magenta) 50%, transparent); }
.hero__btn--ghost { color: var(--text); background: transparent; border-color: color-mix(in oklab, var(--cyan) 50%, transparent); }
.hero__btn:hover { filter: brightness(1.1); }
```

- [ ] **Step 5: Run test to verify it passes**

Run: `npx vitest run src/components/hero/hero.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/components/hero/
git commit -m "feat: add neon hero with logo and CTAs"
```

---

## Task 15: Wire it together in main.ts

**Files:**
- Modify: `src/main.ts`
- Test: `src/main.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
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
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/main.test.ts`
Expected: FAIL — `mountApp` not exported.

- [ ] **Step 3: Rewrite `src/main.ts`**

```ts
import './styles/global.css';
import { ARTISTS } from './data/artists';
import { createPlayer } from './lib/player';
import { createHero } from './components/hero/hero';
import { createWall } from './components/wall/wall';
import { createArtistDrawer } from './components/artist-drawer/drawer';
import { createDeckBar } from './components/deck-bar/deck-bar';
import type { Artist, Track } from './types';

export function mountApp(root: HTMLElement): void {
  root.innerHTML = '';
  const player = createPlayer();

  const wall = createWall(ARTISTS, (artist) => drawer.open(artist));

  const drawer = createArtistDrawer((artist: Artist, track: Track) => {
    player.play(artist, track);
    wall.setActive(artist.id);
    drawer.close();
  });

  const playFirst = (artist: Artist) => {
    const track = artist.tracks[0];
    if (track) {
      player.play(artist, track);
      wall.setActive(artist.id);
    }
  };
  const randomArtist = (): Artist => ARTISTS[Math.floor(Math.random() * ARTISTS.length)]!;

  const hero = createHero({
    onStart: () => playFirst(ARTISTS[0] ?? randomArtist()),
    onShuffle: () => playFirst(randomArtist()),
  });

  const deck = createDeckBar(player);

  root.append(hero, wall, drawer.el, deck);
}

const rootEl = document.querySelector<HTMLElement>('#app');
if (rootEl) mountApp(rootEl);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/main.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Run the full unit suite + build**

Run: `npm run test && npm run build`
Expected: all unit tests PASS; build emits `dist/`.

- [ ] **Step 6: Commit**

```bash
git add src/main.ts src/main.test.ts
git commit -m "feat: wire hero, wall, drawer, and deck into the app"
```

---

## Task 16: Vercel config + production CSP

**Files:**
- Create: `vercel.json`

- [ ] **Step 1: Write `vercel.json`**

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        { "key": "Content-Security-Policy", "value": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'; connect-src 'self'; frame-src https://www.youtube-nocookie.com https://w.soundcloud.com https://www.mixcloud.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'" },
        { "key": "Strict-Transport-Security", "value": "max-age=31536000; includeSubDomains; preload" },
        { "key": "X-Content-Type-Options", "value": "nosniff" },
        { "key": "Referrer-Policy", "value": "strict-origin-when-cross-origin" },
        { "key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()" }
      ]
    }
  ]
}
```

- [ ] **Step 2: Sanity-check the embed origins match the adapters**

Run: `grep -rEo "https://(www\.youtube-nocookie\.com|w\.soundcloud\.com|www\.mixcloud\.com)" src/lib/embeds`
Expected: each of the three hosts appears, and each is present in the `frame-src` directive above. (Manual cross-check — no code change.)

- [ ] **Step 3: Commit**

```bash
git add vercel.json
git commit -m "chore: add vercel static config with strict CSP"
```

---

## Task 17: E2E — embed smoke test

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/smoke.spec.ts`

- [ ] **Step 1: Write `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  webServer: {
    command: 'npm run build && npm run preview',
    url: 'http://localhost:4173',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
  use: { baseURL: 'http://localhost:4173', colorScheme: 'dark' },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
});
```

- [ ] **Step 2: Write `tests/e2e/smoke.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

test('hero renders the logo', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1.hero__logo')).toContainText('DJ');
});

test('clicking a tile then a track mounts the deck iframe', async ({ page }) => {
  await page.goto('/');
  await page.locator('.tile').first().click();
  await expect(page.locator('.drawer')).toHaveAttribute('aria-hidden', 'false');
  await page.locator('.drawer__row').first().click();
  const iframe = page.locator('.deck iframe');
  await expect(iframe).toHaveCount(1);
  const src = await iframe.getAttribute('src');
  expect(src).toMatch(/youtube-nocookie\.com|w\.soundcloud\.com|mixcloud\.com\/widget/);
});

test('the deck iframe survives scrolling (keeps playing while browsing)', async ({ page }) => {
  await page.goto('/');
  await page.locator('.tile').first().click();
  await page.locator('.drawer__row').first().click();
  const before = await page.locator('.deck iframe').getAttribute('src');
  await page.mouse.wheel(0, 2000);
  const after = await page.locator('.deck iframe').getAttribute('src');
  expect(after).toBe(before); // same src, never re-mounted
});
```

- [ ] **Step 3: Install browsers and run**

Run: `npx playwright install chromium && npm run e2e -- tests/e2e/smoke.spec.ts`
Expected: 3 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add playwright.config.ts tests/e2e/smoke.spec.ts
git commit -m "test: add e2e embed smoke test"
```

---

## Task 18: E2E — visual regression

**Files:**
- Create: `tests/e2e/visual.spec.ts`

- [ ] **Step 1: Write `tests/e2e/visual.spec.ts`**

```ts
import { test, expect } from '@playwright/test';

const BREAKPOINTS = [320, 768, 1024, 1440];

for (const width of BREAKPOINTS) {
  test(`homepage @ ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    // freeze motion for stable shots
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await expect(page).toHaveScreenshot(`home-${width}.png`, { fullPage: true, maxDiffPixelRatio: 0.02 });
  });
}
```

- [ ] **Step 2: Generate baselines**

Run: `npm run e2e -- tests/e2e/visual.spec.ts --update-snapshots`
Expected: 4 baseline PNGs written under `tests/e2e/visual.spec.ts-snapshots/`.

- [ ] **Step 3: Re-run to confirm they pass against themselves**

Run: `npm run e2e -- tests/e2e/visual.spec.ts`
Expected: 4 tests PASS.

- [ ] **Step 4: Commit**

```bash
git add tests/e2e/visual.spec.ts tests/e2e/visual.spec.ts-snapshots/
git commit -m "test: add visual regression baselines at 4 breakpoints"
```

---

## Task 19: Deploy to Vercel

**Files:** none (deploy only)

- [ ] **Step 1: Final full verification**

Run: `npm run test && npm run build && npm run e2e`
Expected: all unit + e2e tests PASS; clean build.

- [ ] **Step 2: Deploy a preview**

Run: `vercel` (from `~/edm-hub`, link to a new project when prompted)
Expected: a preview URL; open it and confirm a tile → track → audible playback.

- [ ] **Step 3: Promote to production**

Run: `vercel --prod`
Expected: production URL live; CSP headers present (`curl -sI <url> | grep -i content-security-policy`).

- [ ] **Step 4: Commit any config Vercel added**

```bash
git add -A
git commit -m "chore: vercel project link" || echo "nothing to commit"
```

---

## Self-Review

**Spec coverage:**
- Embedded official players, multi-platform adaptive → Tasks 3–6 (adapters + dispatcher). ✓
- Curated legends wall (~38) → Tasks 8, 10, 11 (data + tile + wall). ✓
- Persistent now-playing deck bar, music survives browsing → Task 13 + smoke test in Task 17 (iframe reuse, scroll-survival assertion). ✓
- Pure Neon Rave visuals → Task 9 tokens + per-component CSS. ✓
- Hero with big DJ SET logo + Start/Shuffle → Task 14. ✓
- "All the music for selection" per artist → Task 12 drawer. ✓
- Typographic neon tiles, no portraits → Task 10 (name + genre + accent, no images). ✓
- Even-split roster, Garrix/Alesso/Ultra guaranteed → Task 8 seed (sourced by the harvest swarm). ✓
- Data model (Platform/Track/Artist) → Task 2. ✓
- Error handling: unverified/dead embeds dropped → Task 8 (`toTrack` filters `verified`, zero-track artists removed). Note: in-session dead-embed auto-skip in the deck bar is a v1.1 enhancement; v1 prevents dead embeds at the data layer by only shipping oEmbed-verified refs. ✓ (documented limitation)
- Security/CSP → Task 16. ✓
- Testing (visual @ 4 breakpoints, embed smoke, adapter + player units) → Tasks 17, 18 + unit tests throughout. ✓

**Placeholder scan:** No TBD/TODO; every code step shows complete code; the only conditional content is the Task 8 seed stub, which is real valid JSON used only if the swarm hasn't landed yet.

**Type consistency:** `Track` = `{title, platform, ref, kind}` everywhere (Task 2 defines it; Tasks 6, 8, 10, 12, 13 consume the same shape). `createPlayer().play(artist, track)` signature matches its callers in Tasks 13 and 15. `createWall(...).setActive(id)` defined in Task 11, called in Task 15. `embedSrc(track)` defined in Task 6, called in Task 13. Adapter hosts in Task 16 CSP match the literal hosts in Tasks 3–5.

**Known v1 limitation (documented, not a gap):** the deck bar's "couldn't load, auto-skip" behavior from spec §6 is reduced to data-layer prevention (only verified embeds ship). Runtime auto-skip on a mid-session embed failure is deferred to v1.1 — added to the spec's open follow-ups.
