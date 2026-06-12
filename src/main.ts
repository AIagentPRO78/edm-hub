import './styles/global.css';
import { inject } from '@vercel/analytics';
import { ARTISTS } from './data/artists';
import { createPlayer } from './lib/player';
import { createHero } from './components/hero/hero';
import { createWall } from './components/wall/wall';
import { createArtistDrawer } from './components/artist-drawer/drawer';
import { createDeckBar } from './components/deck-bar/deck-bar';
import { createDonateModal } from './components/donate/donate-modal';
import { createFooter } from './components/footer/footer';
import { createFilterBar } from './components/filter/filter-bar';
import { pickRandomTrack } from './lib/shuffle';
import type { Artist, Track } from './types';

export function mountApp(root: HTMLElement): void {
  root.innerHTML = '';
  const params = new URLSearchParams(window.location.search);
  const player = createPlayer();

  const wall = createWall(ARTISTS, (artist) => drawer.open(artist));

  const drawer = createArtistDrawer((artist: Artist, track: Track) => {
    playTrack(artist, track);
    drawer.close();
  });

  // Linear back-stack of previously-playing tracks for the deck's "previous"
  // control. playTrack records the outgoing track; playPrevious replays it
  // without re-recording (so repeated taps walk backwards).
  const history: Array<{ artist: Artist; track: Track }> = [];
  let goingBack = false;
  const playTrack = (artist: Artist, track: Track): void => {
    if (!goingBack && player.state.artist && player.state.track) {
      history.push({ artist: player.state.artist, track: player.state.track });
      if (history.length > 50) history.shift();
    }
    player.play(artist, track);
    wall.setActive(artist.id);
  };
  const playPrevious = (): void => {
    const prev = history.pop();
    if (!prev) return;
    goingBack = true;
    player.play(prev.artist, prev.track);
    wall.setActive(prev.artist.id);
    goingBack = false;
  };

  const playFirst = (artist: Artist) => {
    const track = artist.tracks[0];
    if (track) playTrack(artist, track);
  };
  const randomArtist = (): Artist => ARTISTS[Math.floor(Math.random() * ARTISTS.length)]!;
  const playRandom = (): void => {
    const sel = pickRandomTrack(ARTISTS, player.state.artist?.id ?? undefined);
    if (sel) playTrack(sel.artist, sel.track);
  };

  const hero = createHero({
    // Start on a random artist's signature (first) track so the first
    // impression varies between visits instead of always artist #0.
    onStart: () => playFirst(randomArtist()),
    onShuffle: playRandom,
  });

  const donate = createDonateModal();
  const openDonate = (): void => {
    void donate.open();
  };

  // Continuous shuffle: when a track ends, advance to another random track.
  // onSkip wires the deck's "next" control to the same advance.
  const deck = createDeckBar(player, {
    onTip: openDonate,
    onEnded: playRandom,
    onSkip: playRandom,
    onPrev: playPrevious,
  });
  const footer = createFooter(openDonate);

  // Mirror the now-playing track into the URL so it can be copied / shared, and
  // restored on load via ?a=<artistId>&t=<trackIndex> (other params preserved).
  player.subscribe(({ artist, track }) => {
    if (!artist || !track) return;
    const idx = artist.tracks.indexOf(track);
    const url = new URL(window.location.href);
    url.searchParams.set('a', artist.id);
    url.searchParams.set('t', String(idx < 0 ? 0 : idx));
    window.history.replaceState(null, '', url);
  });

  // Skip link + a real <main> landmark so keyboard / screen-reader users can
  // jump past the full-height hero straight to the filter + wall (WCAG 2.4.1).
  const skip = document.createElement('a');
  skip.className = 'skip-link';
  skip.href = '#main';
  skip.textContent = 'Skip to the wall';

  // ?q= seeds the search (the SearchAction target); the bar filters the wall.
  const filterBar = createFilterBar(ARTISTS, wall.setFilter, params.get('q') ?? '');

  const main = document.createElement('main');
  main.id = 'main';
  main.tabIndex = -1;
  main.append(filterBar, wall);

  root.append(skip, hero, main, footer, drawer.el, deck, donate.el);

  // Restore a shared now-playing track.
  const sharedId = params.get('a');
  if (sharedId) {
    const artist = ARTISTS.find((a) => a.id === sharedId);
    const raw = Number(params.get('t'));
    const t = Number.isInteger(raw) && raw >= 0 ? raw : 0;
    const track = artist?.tracks[t];
    if (artist && track) playTrack(artist, track);
  }

  // Stripe redirects back to /?tip=success after a completed donation.
  if (params.get('tip') === 'success') {
    showTipThanks();
  }
}

function showTipThanks(): void {
  const toast = document.createElement('div');
  toast.className = 'tip-toast';
  toast.setAttribute('role', 'status');
  toast.textContent = 'Thank you — the music plays on 🔊';
  document.body.append(toast);
  window.setTimeout(() => toast.remove(), 6000);
}

const rootEl = document.querySelector<HTMLElement>('#app');
if (rootEl) mountApp(rootEl);

// Privacy-friendly, cookieless visitor counts. First-party only: the script and
// beacons stay same-origin under /_vercel/insights, so the strict CSP needs no
// change. Production builds only — keeps dev and the jsdom test run silent.
if (import.meta.env.PROD) inject();

// Service worker: offline app shell + fast repeat loads. Guarded so it never
// runs under tests / SSR.
if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
