# DJ SET — The Legends Wall

**Date:** 2026-06-06
**Status:** Design approved (pending written-spec review)
**Workspace:** `~/edm-hub`

---

## 1. Concept

A single-page, neon-rave website that gathers the world's famous EDM and Trance
DJs onto one wall and plays their real music in-page. One big glowing **DJ SET**
logo at the top, a curated wall of ~38 legends below, and a persistent
"now playing" deck bar pinned to the bottom. Click an artist, pick a track or
set, and it plays over the web while you keep browsing.

All playback is via **embedded official players** (SoundCloud / YouTube /
Mixcloud). The platforms hold the licenses, so playback is fully legal and free,
and the audio is the artists' real catalogs.

**What it is:** a curated, beautiful, instantly-playable jukebox wall.

**What it is NOT (v1):** a search engine, a user-account app, a self-hosted music
host, or a backend service. No database, no auth, no server-side code.

---

## 2. Visual direction

**Pure Neon Rave** (locked via visual brainstorm):

- Dark cyberpunk-club base (`#07060f`).
- Magenta (`#ff2bd6`) + cyan (`#19f0ff`) neon accents throughout — hero, wall,
  and deck bar.
- Big italic **DJ SET** wordmark with a white → cyan → magenta gradient and neon
  drop-shadow glow; neon light beams behind it.
- Glassy tiles with per-artist accent glow.
- No festival warmth, no orange (an earlier blend was explicitly reverted).

Design tokens (neon palette, type scale, spacing, motion easings) live in
`src/styles/tokens.css` as CSS custom properties. Animations stay on
compositor-friendly properties (`transform`, `opacity`, `filter`) and respect
`prefers-reduced-motion`.

---

## 3. Architecture & tech stack

A **static single-page app** — no framework, no backend.

- **Build:** Vite + vanilla TypeScript. Small, focused modules; CSS
  custom-property tokens; no React/Vue runtime weight.
- **Why not Next/Astro:** overkill for one curated page with no routing or
  server data. Astro is the natural upgrade path *if* search/CMS/accounts are
  ever wanted — noted as future, not built now.
- **Deploy:** Vercel via CLI.
- **Data:** a typed `artists.ts` module — the roster lives in code, compile-
  checked. No fetch, no CMS.
- **Playback persistence:** because it is a true single page, the deck bar's
  player `<iframe>` lives in a fixed element that is **never destroyed**.
  Scrolling, filtering, and opening artist drawers never touch it, so the music
  keeps playing. Selecting a new track only swaps the iframe `src`.

```
src/
├── main.ts                 # bootstraps the app, wires components to player state
├── data/artists.ts         # the curated roster (typed)
├── components/
│   ├── hero/               # big DJ SET logo + CTAs
│   ├── wall/               # the legends grid + tile
│   ├── artist-drawer/      # per-artist track/set picker
│   └── deck-bar/           # persistent now-playing player
├── lib/
│   ├── embeds/
│   │   ├── soundcloud.ts   # ref -> SoundCloud widget iframe
│   │   ├── youtube.ts      # ref -> youtube-nocookie embed iframe
│   │   └── mixcloud.ts     # ref -> Mixcloud widget iframe
│   └── player.ts           # single source of truth for "what's playing"
└── styles/
    ├── tokens.css          # neon palette, type scale, spacing, easings
    └── global.css
```

---

## 4. Components

### Hero
Full-viewport-height. Magenta/cyan radial glow, neon light beams, the big italic
**DJ SET** wordmark, tagline (`EDM · TRANCE · ONE WALL · PRESS PLAY`), and two
CTAs:

- **▶ Start the set** — plays a featured artist's default track.
- **Shuffle all** — picks a random artist + track.

Subtle idle glow motion; disabled under `prefers-reduced-motion`.

### The Legends Wall
Responsive grid: 6 columns desktop → 3 tablet → 2 mobile. Each tile is a glassy
neon **typographic** card (artist name + per-artist accent glow + optional
monogram), enriched with the platform's official avatar where the embed exposes
one. Hover lifts and brightens the glow. The currently-playing artist's tile
stays lit. Click → opens that artist's drawer.

### Artist Drawer
A light slide-in panel listing that artist's selectable tracks/sets (this is the
"all the music for selection" requirement). Each row: title + source badge
(SoundCloud / YouTube / Mixcloud) + track/set kind. Click a row → loads into the
deck bar and autoplays. Closing the drawer does not stop playback.

### Deck Bar
Fixed bottom, neon. Shows artwork, "Artist — Track," the source platform, a
progress/scrub area, and transport controls. Holds the live player iframe. On
mobile it collapses to a compact strip that expands on tap.

---

## 5. Playback engine (multi-platform adaptive)

`lib/player.ts` holds one piece of state: the currently selected track ref, plus
play/pause and the active artist id. Each track is tagged with its platform and
the id/url needed to embed it. An **adapter per platform** turns a ref into an
iframe `src` + appropriate player height:

- **SoundCloud** → `w.soundcloud.com/player`, `auto_play=true`, audio-only; best
  fit for the aesthetic.
- **YouTube** → `www.youtube-nocookie.com/embed/<id>`, `autoplay=1`; audio plays,
  video tucked into the expandable deck panel.
- **Mixcloud** → Mixcloud widget for full-length sets (A State of Trance, Group
  Therapy, On Air, etc.).

**Autoplay with sound works** because the user clicks a tile/row first — that
gesture satisfies browser autoplay policy. Switching tracks swaps `src` on the
existing iframe rather than creating a new one.

---

## 6. Data model

```ts
type Platform = 'soundcloud' | 'youtube' | 'mixcloud';
type TrackKind = 'track' | 'set';

interface Track {
  title: string;
  platform: Platform;
  ref: string;        // platform-specific id or url the adapter consumes
  kind: TrackKind;
}

interface Artist {
  id: string;         // slug, e.g. 'armin-van-buuren'
  name: string;
  genres: string[];   // e.g. ['Trance'] or ['Big Room', 'Progressive House']
  accent: string;     // neon hex for the tile glow
  tracks: Track[];    // 2-5 selectable; tracks[0] is the default
}
```

Populating the roster — finding the **official, embeddable** link per artist on
SoundCloud/YouTube/Mixcloud and verifying each actually plays — is the heaviest
implementation task and is done as a **verified pass** during the build, not
hand-waved. Every embed is loaded and confirmed before it ships; an artist with
no good official embed is swapped, not left broken.

---

## 7. Roster

~38 artists, **even split** (~50% Trance legends, ~50% broader EDM icons), with
**guaranteed slots** for Martin Garrix, Alesso, and popular Ultra Music Festival
mainstage regulars. The list below is the **proposed seed roster**, subject to
official-embed verification (an artist may be swapped if no official embed
exists).

**Trance pillar (~19):** Armin van Buuren, Above & Beyond, Paul van Dyk, Ferry
Corsten, ATB, Gareth Emery, Aly & Fila, Cosmic Gate, Markus Schulz, Andrew
Rayel, Dash Berlin, Paul Oakenfold, Vini Vici, Giuseppe Ottaviani, Super8 & Tab,
John O'Callaghan, Solarstone, BT, Ilan Bluestone.

**Broad EDM pillar (~19):** Martin Garrix (guaranteed), Alesso (guaranteed),
Swedish House Mafia, Hardwell, Tiësto, David Guetta, Calvin Harris, Deadmau5,
Carl Cox, Skrillex, Zedd, Afrojack, Steve Aoki, Eric Prydz, Dimitri Vegas & Like
Mike, Axwell Λ Ingrosso, Don Diablo, Marshmello, Avicii (tribute).

Ultra mainstage coverage spans both pillars (Garrix, Alesso, SHM, Hardwell,
Guetta, Afrojack, Aoki, DVLM, Zedd, Armin, Tiësto, Above & Beyond, Carl Cox,
Eric Prydz).

---

## 8. Error handling & edge cases

- **Dead / unembeddable link:** the adapter detects iframe load failure → deck
  bar surfaces "couldn't load, try another" and auto-skips to the next track. No
  silent failure.
- **Mixed platforms within one artist:** expected and supported — adapters are
  per-track.
- **Mobile autoplay quirks / data use:** tiles lazy-load; only the deck iframe is
  ever live; preconnect to the embed origins.
- **Accessibility:** full keyboard navigation on tiles, drawer, and deck;
  visible focus states; neon tuned to pass WCAG contrast; reduced-motion honored.

---

## 9. Security & performance

- Production **CSP**: `frame-src` limited to `w.soundcloud.com`,
  `www.youtube-nocookie.com`, and `*.mixcloud.com`; `object-src 'none'`;
  `base-uri 'self'`; standard hardening headers (HSTS, X-Content-Type-Options,
  Referrer-Policy, Permissions-Policy).
- Sandboxed iframes where each platform allows.
- Bundle target: microsite budget (< 80kb JS gzipped) — trivial given minimal JS.
- Core Web Vitals targets per web performance rules (LCP < 2.5s, CLS < 0.1).

---

## 10. Testing

- **Playwright visual regression** at 320 / 768 / 1024 / 1440 (dark only).
- **Embed smoke test:** load each artist's default track, assert the iframe
  mounts and the player origin responds.
- **Unit tests:** the three embed adapters (ref → correct iframe URL) and the
  `player.ts` state transitions.

---

## 11. Out of scope for v1 (YAGNI)

Search, genre-filter chips, user accounts, favorites/playlists, a backend,
self-hosted audio, and AI-generated portraits of real people (rejected as
deepfakes — tiles are typographic neon instead).

---

## 12. Open follow-ups (post-approval, non-blocking)

- Final site name / domain (working title: **DJ SET**).
- Whether to add genre-filter chips in v2.
- Whether the deck bar should expose a YouTube video panel by default or on
  demand.
