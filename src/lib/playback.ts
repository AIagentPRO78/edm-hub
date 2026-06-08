import type { Platform } from '../types';

interface YTPlayer {
  destroy(): void;
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
}
interface SCNamespace {
  Widget: ((el: HTMLIFrameElement) => SCWidget) & {
    Events: { FINISH: unknown; READY: unknown; ERROR: unknown };
  };
}
interface MixWidget {
  ready: Promise<void>;
  events: { ended: { on(cb: () => void): void; off(cb: () => void): void } };
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
      if (window.YT) resolve(window.YT);
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
}

/**
 * Call `onEnded` when the track in `iframe` finishes, using each platform's
 * official widget API. `hooks.onError` fires when the embed reports a terminal
 * error and `hooks.onReady` when the player API attaches. Returns a cleanup
 * function to detach the listeners.
 */
export function bindEnded(
  iframe: HTMLIFrameElement,
  platform: Platform,
  onEnded: () => void,
  hooks: PlaybackHooks = {},
): () => void {
  let cancelled = false;

  if (platform === 'youtube') {
    let player: YTPlayer | null = null;
    const attach = (YT: YTNamespace) => {
      if (cancelled) return;
      player = new YT.Player(iframe, {
        events: {
          onReady: () => { if (!cancelled) hooks.onReady?.(); },
          onStateChange: (e) => { if (e.data === 0) onEnded(); },
          onError: () => { if (!cancelled) hooks.onError?.(); },
        },
      });
    };
    if (window.YT?.Player) attach(window.YT);
    // A failed API load means we can't observe this track — skip it.
    else void loadYT().then(attach).catch(() => { if (!cancelled) hooks.onError?.(); });
    return () => {
      cancelled = true;
      try { player?.destroy(); } catch { /* iframe already gone */ }
    };
  }

  if (platform === 'soundcloud') {
    let widget: SCWidget | null = null;
    const attach = (SC: SCNamespace) => {
      if (cancelled) return;
      widget = SC.Widget(iframe);
      widget.bind(SC.Widget.Events.FINISH, onEnded);
      if (hooks.onReady) widget.bind(SC.Widget.Events.READY, hooks.onReady);
      if (hooks.onError) widget.bind(SC.Widget.Events.ERROR, hooks.onError);
    };
    if (window.SC) attach(window.SC);
    else void loadScript(SC_API).then(() => { if (window.SC) attach(window.SC); }).catch(() => { if (!cancelled) hooks.onError?.(); });
    return () => {
      cancelled = true;
      try {
        widget?.unbind(window.SC?.Widget.Events.FINISH);
        if (hooks.onReady) widget?.unbind(window.SC?.Widget.Events.READY);
        if (hooks.onError) widget?.unbind(window.SC?.Widget.Events.ERROR);
      } catch { /* noop */ }
    };
  }

  // mixcloud
  let off: (() => void) | null = null;
  const attach = (Mix: MixNamespace) => {
    if (cancelled) return;
    const w = Mix.PlayerWidget(iframe);
    void w.ready.then(() => {
      if (cancelled) return;
      hooks.onReady?.();
      w.events.ended.on(onEnded);
      off = () => w.events.ended.off(onEnded);
    });
  };
  if (window.Mixcloud) attach(window.Mixcloud);
  else void loadScript(MIX_API).then(() => { if (window.Mixcloud) attach(window.Mixcloud); }).catch(() => { if (!cancelled) hooks.onError?.(); });
  return () => {
    cancelled = true;
    try { off?.(); } catch { /* noop */ }
  };
}
