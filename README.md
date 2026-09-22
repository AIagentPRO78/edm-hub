# DJ SET — The Legends Wall

DJ SET is a neon, browser-first wall of EDM and trance legends. It turns a
large curated artist roster into a simple listening surface: find an artist,
open their drawer, choose an official set or track, and keep browsing while
the persistent deck continues playing.

Live site: [djset.club](https://djset.club/)

## What it does

The current catalog contains **88 artists**, **1,532 verified tracks**, and
**24 genres**:

- YouTube, SoundCloud, and Mixcloud playback through official platform embeds
- Search by artist name and filter by genre
- Artist tiles with images, genres, and a focused track drawer
- A persistent deck with play/pause, previous, next, skip, and shuffle controls
- Continuous random playback when a track ends
- Shareable URLs that preserve the selected artist and track
- A service worker for fast repeat loads and an offline app shell
- PWA metadata, Open Graph cards, JSON-LD, sitemap, and a no-JavaScript roster
- Optional one-time hosting tips through Stripe Checkout
- Privacy-friendly, production-only Vercel Web Analytics

The site is a discovery and playback layer, not a music host. It does not
download or serve audio files. The footer states that streams come from
official SoundCloud, YouTube, and Mixcloud embeds, that the site is not
affiliated with the artists, and that tips support hosting rather than
constituting charitable donations.

## Architecture

This is a static single-page application built with Vite and vanilla
TypeScript. There is no database, user account system, CMS, or application
server for the main wall.

```text
src/data/artists.seed.json
        │
        ├── runtime catalog → src/data/artists.ts
        ├── SEO JSON-LD + no-JS roster
        └── curator fields removed from the production bundle

src/main.ts
        ├── hero and filter bar
        ├── artist wall and drawers
        ├── player state and persistent deck
        ├── shareable URL state
        └── donation modal

/api/checkout.ts
        └── server-side amount validation → Stripe-hosted Checkout
```

The Vite configuration performs three important build-time jobs:

1. It generates SEO metadata from the same artist seed that powers the wall.
2. It strips curator-only notes, source URLs, and verification flags from the
   browser bundle, shipping only verified playback fields.
3. It stamps the service-worker cache with the content hash of each build so a
   new deployment does not keep serving an old app shell.

## Data and curation

`src/data/artists.seed.json` is the source catalog. It carries curator-only
metadata such as verification state, source URLs, and notes. Only tracks marked
`verified` are bundled into the runtime catalog.

The project deliberately uses third-party embeds instead of copying music.
Images and playback references remain external, so availability, branding, and
platform policy are controlled by the original providers.

## Local development

Requirements: Node.js and npm.

```bash
npm ci
npm run dev
```

Useful checks:

```bash
npm test
npm run build
npm run preview
```

The test suite covers catalog validation, playback state, embed adapters,
filtering, accessibility behavior, donation amount handling, the wall,
drawers, the deck, and the main application mount.

## Deployment and configuration

The app is designed for Vercel:

```bash
npm run build
```

The optional `/api/checkout` function needs these Vercel environment variables:

- `STRIPE_SECRET_KEY` — server-side Stripe secret; never expose it to Vite
- `STRIPE_CURRENCY` — optional currency override, default `usd`
- `CANONICAL_ORIGIN` — optional canonical redirect origin, default
  `https://djset.club`

The checkout endpoint accepts only `POST`, validates the amount again on the
server between 1 and 1,000 currency units, and uses a canonical-origin
allowlist for success and cancel redirects.

## Repository map

```text
src/components/       UI components and styles
src/data/              curated artist catalog
src/lib/               player, embeds, images, shuffle, donations, a11y
api/                   Vercel serverless checkout endpoint
public/                icons, manifest, service worker, sitemap, social card
tests                  Playwright configuration and end-to-end entry points
docs/                  design specification and implementation plan
vite.config.ts         SEO, data slimming, and service-worker build plugins
```

## Status

The core wall, playback experience, SEO layer, PWA shell, analytics, and
Stripe tip flow are implemented. The repository is intentionally small and
static: the next product work is primarily catalog operations, playback
quality, and audience discovery rather than backend infrastructure.

The repository currently has no explicit open-source license. Add one before
accepting outside contributions or granting reuse rights.
