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
