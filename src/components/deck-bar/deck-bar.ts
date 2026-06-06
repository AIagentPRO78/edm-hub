import type { Player } from '../../lib/player';
import { embedSrc } from '../../lib/embeds';
import { createTipButton } from '../donate/tip-button';
import './deck-bar.css';

const SOURCE_LABEL = { soundcloud: 'SoundCloud', youtube: 'YouTube', mixcloud: 'Mixcloud' } as const;

export function createDeckBar(player: Player, options: { onTip?: () => void } = {}): HTMLElement {
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

  if (options.onTip) {
    bar.append(createTipButton(options.onTip, 'deck'));
  }

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
      // Defence-in-depth: constrain the embedded player. allow-same-origin +
      // allow-scripts are required for the SoundCloud/Mixcloud/YouTube widgets
      // to run; top-navigation and forms are intentionally withheld.
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-presentation allow-popups');
      iframe.setAttribute('loading', 'eager');
      playerSlot.append(iframe);
    }
    iframe.src = embedSrc(track, true);
  });

  return bar;
}
