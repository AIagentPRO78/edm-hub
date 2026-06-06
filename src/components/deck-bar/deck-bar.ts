import type { Player } from '../../lib/player';
import { embedSrc } from '../../lib/embeds';
import { bindEnded } from '../../lib/playback';
import { createTipButton } from '../donate/tip-button';
import './deck-bar.css';

const SOURCE_LABEL = { soundcloud: 'SoundCloud', youtube: 'YouTube', mixcloud: 'Mixcloud' } as const;

export interface DeckOptions {
  onTip?: () => void;
  /** Called when the current track finishes (used for continuous shuffle). */
  onEnded?: () => void;
}

export function createDeckBar(player: Player, options: DeckOptions = {}): HTMLElement {
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

  const playerSlot = document.createElement('div');
  playerSlot.className = 'deck__player';
  let iframe: HTMLIFrameElement | null = null;
  let detach: (() => void) | null = null;

  bar.append(meta, playerSlot);
  if (options.onTip) bar.append(createTipButton(options.onTip, 'deck'));

  player.subscribe(({ artist, track }) => {
    if (!artist || !track) {
      title.textContent = 'Nothing playing';
      sub.textContent = 'Pick an artist to start the set';
      return;
    }
    bar.style.setProperty('--accent', artist.accent);
    title.textContent = `${artist.name} — ${track.title}`;
    sub.textContent = `▶ now playing · via ${SOURCE_LABEL[track.platform]}`;
    bar.classList.toggle('deck--sc', track.platform === 'soundcloud');

    // Mount a fresh player for the new track (tearing down the previous one).
    // The iframe is only recreated on a TRACK CHANGE — scrolling/browsing the
    // wall never touches it, so playback continues uninterrupted.
    if (detach) { detach(); detach = null; }
    if (iframe?.parentNode) iframe.remove();
    iframe = document.createElement('iframe');
    iframe.className = 'deck__iframe';
    iframe.allow = 'autoplay; encrypted-media; fullscreen';
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation allow-popups');
    iframe.setAttribute('loading', 'eager');
    playerSlot.append(iframe);
    iframe.src = embedSrc(track, true);

    // Continuous play: when this track finishes, advance to the next.
    if (options.onEnded) detach = bindEnded(iframe, track.platform, options.onEnded);
  });

  return bar;
}
