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
    onStart: () => playFirst(ARTISTS[0] ?? randomArtist()),
    onShuffle: playRandom,
  });

  const donate = createDonateModal();
  const openDonate = (): void => {
    void donate.open();
  };

  // Continuous shuffle: when a track ends, advance to another random track.
  const deck = createDeckBar(player, { onTip: openDonate, onEnded: playRandom });
  const footer = createFooter(openDonate);

  root.append(hero, wall, footer, drawer.el, deck, donate.el);
}

const rootEl = document.querySelector<HTMLElement>('#app');
if (rootEl) mountApp(rootEl);
