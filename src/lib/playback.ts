import type { Platform } from '../types';

interface YTPlayer {
  destroy(): void;
  playVideo(): void;
}
interface YTPlayerEvents {
  onReady?: () => void;
  onStateChange?: (e: { data: number }) => void;
  onError?: (e: { data: number }) => void;
}
interface YTNamespace {
  Player: new (el: HTMLIFrameElement, opts: { events: YTPlayerEvents }) => YTPlayer;
}
interface SCWidget {
  bind(event: unknown, cb: () => void): void;
  unbind(event: unknown): void;
  play(): void;
}
interface SCNamespace {
  Widget: ((el: HTMLIFrameElement) => SCWidget) & {
    Events: { FINISH: unknown; READY: unknown; ERROR: unknown; PLAY: unknown };
  };
}
interface MixWidget {
  ready: Promise<void>;
  play(): void;
  events: {
    ended: { on(cb: () => void): void; off(cb: () => void): void };
    play?: { on(cb: () => void): void; off(cb: () => void): void };
  };
}
interface MixNamespace {
  PlayerWidget(el: HTMLIFrameElement): MixWidget;
}

declare global {
  interface Window {
    YT?: YTNamespace;
    SC?: SCNamespace;
    Mixcloud?: MixNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

const SC_API = 'https://w.soundcloud.com/player/api.js';
const MIX_API = 'https://widget.mixcloud.com/media/js/widgetApi.js';
const YT_API = 'https://www.youtube.com/iframe_api';

// After a player attaches, if it hasn't begun playing within this window we treat
// autoplay as blocked (the mobile gesture wall) and surface hooks.onBlocked. A
// successful start (PLAYING/BUFFERING on YT, the PLAY event on SC/MC) cancels it.
const AUTOPLAY_GRACE_MS = 2500;

const scripts = new Map<string, Promise<void>>();
function loadScript(src: string): Promise<void> {
  let p = scripts.get(src);
  if (!p) {
    p = new Promise<void>((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = () => resolve();
      s.onerror = () => {
        scripts.delete(src);
        reject(new Error(`failed to load ${src}`));
      };
      document.head.appendChild(s);
    });
    scripts.set(src, p);
  }
  return p;
}

let ytReady: Promise<YTNamespace> | null = null;
function loadYT(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (ytReady) return ytReady;
  ytReady = new Promise<YTNamespace>((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prev === 'function') prev();
      // The API occasionally fires ready before populating window.YT. Don't
      // leave a permanently-pending promise that would hang every later track:
      // reset so a future track retries, and reject so this caller skips now.
      if (window.YT) resolve(window.YT);
      else { ytReady = null; reject(new Error('YT namespace missing after ready callback')); }
    };
    void loadScript(YT_API).catch((err) => {
      // Don't leave a permanently-pending promise: reset so a later track can
      // retry, and reject so callers can fall back to skipping.
      ytReady = null;
      reject(err);
    });
  });
  return ytReady;
}

/** Optional robustness hooks for {@link bindEnded}. */
export interface PlaybackHooks {
  /** The embed reported a terminal error — removed / private / blocked / embedding-disabled. */
  onError?: () => void;
  /** The player API attached to the iframe — used to disarm a load watchdog. */
  onReady?: () => void;
  /**
   * The player attached but autoplay never started within {@link AUTOPLAY_GRACE_MS}
   * — i.e. the mobile browser blocked gesture-less playback. The deck shows a
   * "tap to keep playing" affordance and resumes via {@link PlaybackBinding.play}.
   */
  onBlocked?: () => void;
}

/** Handle returned by {@link bindEnded}. */
export interface PlaybackBinding {
  /** Detach all listeners and tear down the player. */
  detach: () => void;
  /** Start/resume playback. Call inside a user gesture to defeat the mobile autoplay block. */
  play: () => void;
}

/**
 * Call `onEnded` when the track in `iframe` finishes, using each platform's
 * official widget API. `hooks.onError` fires on a terminal embed error,
 * `hooks.onReady` when the player attaches, and `hooks.onBlocked` when autoplay
 * is prevented. Returns a {@link PlaybackBinding} to resume or tear down.
 */
export function bindEnded(
  iframe: HTMLIFrameElement,
  platform: Platform,
  onEnded: () => void,
  hooks: PlaybackHooks = {},
): PlaybackBinding {
  let cancelled = false;
  // Shared autoplay-block detection: armed on ready, disarmed on first playback.
  let started = false;
  let grace: number | null = null;
  const clearGrace = (): void => { if (grace !== null) { clearTimeout(grace); grace = null; } };
  const markStarted = (): void => { started = true; clearGrace(); };
  const armGrace = (): void => {
    clearGrace();
    grace = window.setTimeout(() => { if (!started && !cancelled) hooks.onBlocked?.(); }, AUTOPLAY_GRACE_MS);
  };

  if (platform === 'youtube') {
    let player: YTPlayer | null = null;
    const attach = (YT: YTNamespace) => {
      if (cancelled) return;
      player = new YT.Player(iframe, {
        events: {
          onReady: () => { if (cancelled) return; hooks.onReady?.(); armGrace(); },
          onStateChange: (e) => {
            if (cancelled) return;
            if (e.data === 1 || e.data === 3) markStarted(); // PLAYING / BUFFERING -> autoplay allowed
            if (e.data === 0) onEnded(); // ENDED
          },
          onError: () => { clearGrace(); if (!cancelled) hooks.onError?.(); },
        },
      });
    };
    if (window.YT?.Player) attach(window.YT);
    // A failed API load means we can't observe this track — skip it.
    else void loadYT().then(attach).catch(() => { if (!cancelled) hooks.onError?.(); });
    return {
      detach: () => { cancelled = true; clearGrace(); try { player?.destroy(); } catch { /* iframe already gone */ } },
      play: () => { try { player?.playVideo(); } catch { /* not ready */ } },
    };
  }

  if (platform === 'soundcloud') {
    let widget: SCWidget | null = null;
    // Capture the event constants at bind time so teardown always unbinds the
    // exact listeners, even if window.SC is gone by cleanup.
    let evts: { FINISH: unknown; READY: unknown; ERROR: unknown; PLAY: unknown } | null = null;
    const attach = (SC: SCNamespace) => {
      if (cancelled) return;
      widget = SC.Widget(iframe);
      evts = SC.Widget.Events;
      widget.bind(evts.FINISH, onEnded);
      widget.bind(evts.PLAY, markStarted);
      widget.bind(evts.READY, () => { if (cancelled) return; hooks.onReady?.(); armGrace(); });
      if (hooks.onError) widget.bind(evts.ERROR, () => { clearGrace(); if (!cancelled) hooks.onError?.(); });
    };
    if (window.SC) attach(window.SC);
    else void loadScript(SC_API).then(() => { if (window.SC) attach(window.SC); }).catch(() => { if (!cancelled) hooks.onError?.(); });
    return {
      detach: () => {
        cancelled = true;
        clearGrace();
        try {
          if (widget && evts) {
            widget.unbind(evts.FINISH);
            widget.unbind(evts.PLAY);
            widget.unbind(evts.READY);
            if (hooks.onError) widget.unbind(evts.ERROR);
          }
        } catch { /* noop */ }
      },
      play: () => { try { widget?.play(); } catch { /* not ready */ } },
    };
  }

  // mixcloud
  let off: (() => void) | null = null;
  let mix: MixWidget | null = null;
  const attach = (Mix: MixNamespace) => {
    if (cancelled) return;
    const w = Mix.PlayerWidget(iframe);
    mix = w;
    void w.ready.then(() => {
      if (cancelled) return;
      hooks.onReady?.();
      armGrace();
      w.events.ended.on(onEnded);
      w.events.play?.on(markStarted);
      off = () => { w.events.ended.off(onEnded); w.events.play?.off(markStarted); };
    }).catch(() => { clearGrace(); if (!cancelled) hooks.onError?.(); }); // embed 404 / CSP / widget reject -> skip
  };
  if (window.Mixcloud) attach(window.Mixcloud);
  else void loadScript(MIX_API).then(() => { if (window.Mixcloud) attach(window.Mixcloud); }).catch(() => { if (!cancelled) hooks.onError?.(); });
  return {
    detach: () => { cancelled = true; clearGrace(); try { off?.(); } catch { /* noop */ } },
    play: () => { try { mix?.play(); } catch { /* not ready */ } },
  };
}
