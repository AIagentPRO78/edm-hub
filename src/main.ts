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
