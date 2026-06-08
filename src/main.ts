import './styles/global.css';
import { ARTISTS } from './data/artists';
import { createPlayer } from './lib/player';
import { createHero } from './components/hero/hero';
import { createWall } from './components/wall/wall';
import { createArtistDrawer } from './components/artist-drawer/drawer';
import { createDeckBar } from './components/deck-bar/deck-bar';
import { createDonateModal } from './components/donate/donate-modal';
import { createFooter } from './components/footer/footer';
import { pickRandomTrack } from './lib/shuffle';
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
  const playRandom = (): void => {
    const sel = pickRandomTrack(ARTISTS, player.state.artist?.id ?? undefined);
    if (sel) {
      player.play(sel.artist, sel.track);
      wall.setActive(sel.artist.id);
    }
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
  const deck = createDeckBar(player, { onTip: openDonate, onEnded: playRandom, onSkip: playRandom });
  const footer = createFooter(openDonate);

  // Skip link + a real <main> landmark so keyboard / screen-reader users can
  // jump past the full-height hero straight to the wall (WCAG 2.4.1).
  const skip = document.createElement('a');
  skip.className = 'skip-link';
  skip.href = '#main';
  skip.textContent = 'Skip to the wall';

  const main = document.createElement('main');
  main.id = 'main';
  main.tabIndex = -1;
  main.append(wall);

  root.append(skip, hero, main, footer, drawer.el, deck, donate.el);

  // Stripe redirects back to /?tip=success after a completed donation.
  if (new URLSearchParams(window.location.search).get('tip') === 'success') {
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
