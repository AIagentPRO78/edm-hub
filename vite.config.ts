import { defineConfig, type HtmlTagDescriptor, type PluginOption } from 'vite';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const SITE_URL = 'https://djset.club';
const SITE_DESC = "The world's EDM and Trance legends on one neon wall. Press play.";

interface SeedArtist {
  id: string;
  name: string;
  genres: string[];
  image?: string;
}

function loadArtists(): SeedArtist[] {
  let parsed: unknown;
  try {
    const raw = readFileSync(resolve(process.cwd(), 'src/data/artists.seed.json'), 'utf-8');
    parsed = JSON.parse(raw);
  } catch (e) {
    throw new Error(
      `[djset-seo] failed to load src/data/artists.seed.json: ${e instanceof Error ? e.message : String(e)}`
    );
  }
  if (!Array.isArray(parsed)) {
    throw new Error('[djset-seo] artists.seed.json did not parse to an array');
  }
  // Drop any malformed entry so a missing name can never leak "undefined" into
  // the JSON-LD or the noscript roster (keeps numberOfItems honest too).
  return (parsed as SeedArtist[]).filter((a) => typeof a?.name === 'string' && a.name.length > 0);
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * SEO plugin: this is a client-rendered SPA, so without help a crawler that
 * skips JS sees an empty <div id="app">. We inject (a) JSON-LD describing the
 * site and the full artist roster as MusicGroup entities, and (b) a <noscript>
 * content fallback naming every legend — both generated from the seed so they
 * never drift from what the wall actually renders.
 */
function seoPlugin(): PluginOption {
  return {
    name: 'djset-seo',
    transformIndexHtml(): HtmlTagDescriptor[] {
      const artists = loadArtists();

      const jsonLd = {
        '@context': 'https://schema.org',
        '@graph': [
          {
            '@type': 'WebSite',
            '@id': `${SITE_URL}/#website`,
            url: `${SITE_URL}/`,
            name: 'DJ SET',
            description: SITE_DESC,
            inLanguage: 'en',
          },
          {
            '@type': 'CollectionPage',
            '@id': `${SITE_URL}/#webpage`,
            url: `${SITE_URL}/`,
            name: 'DJ SET — The Legends Wall',
            description: SITE_DESC,
            isPartOf: { '@id': `${SITE_URL}/#website` },
            about: { '@id': `${SITE_URL}/#roster` },
          },
          {
            '@type': 'ItemList',
            '@id': `${SITE_URL}/#roster`,
            name: 'EDM & Trance Legends',
            numberOfItems: artists.length,
            itemListElement: artists.map((a, i) => ({
              '@type': 'ListItem',
              position: i + 1,
              item: {
                '@type': 'MusicGroup',
                '@id': `${SITE_URL}/#artist-${a.id}`,
                name: a.name,
                ...(a.genres.length ? { genre: a.genres } : {}),
                ...(a.image ? { image: a.image } : {}),
              },
            })),
          },
        ],
      };
      // Escape '<' so artist data can never break out of the <script> element.
      const jsonLdStr = JSON.stringify(jsonLd).replace(/</g, '\\u003c');

      const roster = artists
        .map((a) => {
          const g = a.genres[0];
          return `<li>${escapeHtml(a.name)}${g ? ` — ${escapeHtml(g)}` : ''}</li>`;
        })
        .join('');
      const noscript =
        `<header><h1>DJ SET — The Legends Wall</h1></header>` +
        `<main><p>${escapeHtml(SITE_DESC)} Stream official sets and top tracks from the biggest names in EDM and Trance.</p>` +
        `<h2>Featured artists</h2><ul>${roster}</ul></main>`;

      return [
        // head-prepend puts the structured data ahead of Vite's render-blocking
        // asset tags; body-prepend puts the no-JS roster before the empty #app.
        { tag: 'script', attrs: { type: 'application/ld+json' }, children: jsonLdStr, injectTo: 'head-prepend' },
        { tag: 'noscript', children: noscript, injectTo: 'body-prepend' },
      ];
    },
  };
}

export default defineConfig({
  plugins: [seoPlugin()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test-setup.ts'],
    include: ['src/**/*.test.ts'],
  },
});
