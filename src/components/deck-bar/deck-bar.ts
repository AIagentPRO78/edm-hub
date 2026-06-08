import type { Player } from '../../lib/player';
import { embedSrc } from '../../lib/embeds';
import { bindEnded } from '../../lib/playback';
import { createTipButton } from '../donate/tip-button';
import './deck-bar.css';

const SOURCE_LABEL = { soundcloud: 'SoundCloud', youtube: 'YouTube', mixcloud: 'Mixcloud' } as const;

// If a freshly-mounted player never even attaches its API within this window
// (dead iframe / blocked script), skip to the next track. Disarmed on attach,
// so a loaded-but-not-yet-tapped player is never wrongly skipped.
const WATCHDOG_MS = 15000;

export interface DeckOptions {
  onTip?: () => void;
  /** Called when the current track finishes (used for continuous shuffle). */
  onEnded?: () => void;
  /** Called when the user taps the deck's skip control — advance to the next track. */
  onSkip?: () => void;
}

export function createDeckBar(player: Player, options: DeckOptions = {}): HTMLElement {
  const bar = document.createElement('div');
  bar.className = 'deck';
  bar.setAttribute('role', 'region');
  bar.setAttribute('aria-label', 'Now playing');

  const meta = document.createElement('div');
  meta.className = 'deck__meta';
  // Announce track changes to screen readers — continuous shuffle auto-advances
  // with no user action, so a polite live region is the only signal (WCAG 4.1.3).
  meta.setAttribute('aria-live', 'polite');
  meta.setAttribute('aria-atomic', 'true');
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
  let watchdog: number | null = null;
  const clearWatchdog = (): void => {
    if (watchdog !== null) { clearTimeout(watchdog); watchdog = null; }
  };

  bar.append(meta, playerSlot);
  if (options.onSkip) {
    const skip = document.createElement('button');
    skip.type = 'button';
    skip.className = 'deck__skip';
    skip.setAttribute('aria-label', 'Skip to next track');
    const glyph = document.createElement('span');
    glyph.setAttribute('aria-hidden', 'true');
    glyph.textContent = '⏭';
    skip.append(glyph);
    skip.addEventListener('click', () => options.onSkip!());
    bar.append(skip);
  }
  if (options.onTip) bar.append(createTipButton(options.onTip, 'deck'));

  // The deck is fixed to the bottom and its height varies (slim when idle, a
  // tall player panel on phones, taller still for SoundCloud's waveform).
  // A ResizeObserver mirrors its real height into --deck-h on EVERY size change
  // — track change, breakpoint flip, or device rotation — so body padding and
  // the tip toast always reserve the right space even when the viewport changes
  // mid-track (a single rAF on track-change would leave --deck-h stale on resize).
  const deckResize = new ResizeObserver(() => {
    document.documentElement.style.setProperty('--deck-h', `${bar.offsetHeight}px`);
  });
  deckResize.observe(bar);

  player.subscribe(({ artist, track }) => {
    // Tear down the previous track's listeners + watchdog before anything else.
    if (detach) { detach(); detach = null; }
    clearWatchdog();

    if (!artist || !track) {
      title.textContent = 'Nothing playing';
      sub.textContent = 'Pick an artist to start the set';
      // --deck-h follows the deck's real size via the ResizeObserver; as the
      // deck shrinks back to idle height the observer reports it automatically.
      return;
    }
    bar.style.setProperty('--accent', artist.accent);
    title.textContent = `${artist.name} — ${track.title}`;
    sub.textContent = `Now playing · via ${SOURCE_LABEL[track.platform]}`;
    bar.classList.toggle('deck--sc', track.platform === 'soundcloud');

    // Mount a fresh player for the new track. The iframe is only recreated on a
    // TRACK CHANGE — scrolling/browsing the wall never touches it, so playback
    // continues uninterrupted.
    if (iframe?.parentNode) iframe.remove();
    iframe = document.createElement('iframe');
    iframe.className = 'deck__iframe';
    iframe.allow = 'autoplay; encrypted-media; fullscreen';
    // No allow-presentation: WebKit rejects it as an invalid sandbox flag (logs
    // on every iOS load) and it is not needed for playback; fullscreen comes
    // from the allow attribute above.
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-popups');
    iframe.setAttribute('loading', 'eager');
    playerSlot.append(iframe);
    iframe.src = embedSrc(track, true);

    // Auto-advance on a natural finish, a terminal embed error (removed /
    // private / region-blocked / embedding-disabled), or if the player never
    // even attaches. With 1300+ third-party refs some will rot; this keeps
    // continuous shuffle from dead-ending on a black frame.
    const advance = options.onEnded;
    if (advance) {
      let settled = false;
      const skipOnce = (): void => {
        if (settled) return;
        settled = true;
        clearWatchdog();
        advance();
      };
      detach = bindEnded(iframe, track.platform, skipOnce, {
        onError: skipOnce,
        onReady: clearWatchdog,
      });
      watchdog = window.setTimeout(skipOnce, WATCHDOG_MS);
    }
  });

  return bar;
}
