import { describe, it, expect, vi, afterEach } from 'vitest';
import { bindEnded } from './playback';

afterEach(() => {
  delete (window as unknown as { SC?: unknown }).SC;
  delete (window as unknown as { YT?: unknown }).YT;
  delete (window as unknown as { Mixcloud?: unknown }).Mixcloud;
});

describe('bindEnded', () => {
  it('fires onEnded on a SoundCloud FINISH event and unbinds on cleanup', () => {
    const handlers: Record<string, () => void> = {};
    const bind = vi.fn((e: string, c: () => void) => { handlers[e] = c; });
    const unbind = vi.fn();
    const Widget = Object.assign(() => ({ bind, unbind, play: vi.fn() }), {
      Events: { FINISH: 'finish', READY: 'ready', ERROR: 'error', PLAY: 'play' },
    });
    (window as unknown as { SC: unknown }).SC = { Widget };

    const onEnded = vi.fn();
    const { detach } = bindEnded(document.createElement('iframe'), 'soundcloud', onEnded);
    handlers['finish']!();
    expect(onEnded).toHaveBeenCalledTimes(1);
    detach();
    expect(unbind).toHaveBeenCalledWith('finish'); // FINISH + PLAY + READY all unbound
  });

  it('fires onEnded when the YouTube player reports ended (state 0), not while playing', () => {
    let handler: ((e: { data: number }) => void) | null = null;
    class FakePlayer {
      constructor(_el: unknown, opts: { events: { onStateChange: (e: { data: number }) => void } }) {
        handler = opts.events.onStateChange;
      }
      destroy(): void {}
    }
    (window as unknown as { YT: unknown }).YT = { Player: FakePlayer };

    const onEnded = vi.fn();
    bindEnded(document.createElement('iframe'), 'youtube', onEnded);
    handler!({ data: 1 }); // playing
    expect(onEnded).not.toHaveBeenCalled();
    handler!({ data: 0 }); // ended
    expect(onEnded).toHaveBeenCalledTimes(1);
  });

  it('fires hooks.onError when the YouTube player reports an error', () => {
    let onError: (() => void) | null = null;
    class FakePlayer {
      constructor(_el: unknown, opts: { events: { onError?: () => void } }) {
        onError = opts.events.onError ?? null;
      }
      destroy(): void {}
    }
    (window as unknown as { YT: unknown }).YT = { Player: FakePlayer };
    const onErr = vi.fn();
    bindEnded(document.createElement('iframe'), 'youtube', vi.fn(), { onError: onErr });
    onError!();
    expect(onErr).toHaveBeenCalledTimes(1);
  });

  it('fires hooks.onReady when the YouTube player attaches', () => {
    let onReady: (() => void) | null = null;
    class FakePlayer {
      constructor(_el: unknown, opts: { events: { onReady?: () => void } }) {
        onReady = opts.events.onReady ?? null;
      }
      destroy(): void {}
    }
    (window as unknown as { YT: unknown }).YT = { Player: FakePlayer };
    const ready = vi.fn();
    bindEnded(document.createElement('iframe'), 'youtube', vi.fn(), { onReady: ready });
    onReady!();
    expect(ready).toHaveBeenCalledTimes(1);
  });

  it('binds SoundCloud ERROR and READY to the matching hooks', () => {
    const handlers: Record<string, () => void> = {};
    const bind = vi.fn((e: string, c: () => void) => { handlers[e] = c; });
    const Widget = Object.assign(() => ({ bind, unbind: vi.fn() }), {
      Events: { FINISH: 'finish', READY: 'ready', ERROR: 'error' },
    });
    (window as unknown as { SC: unknown }).SC = { Widget };
    const onErr = vi.fn();
    const ready = vi.fn();
    bindEnded(document.createElement('iframe'), 'soundcloud', vi.fn(), { onError: onErr, onReady: ready });
    handlers['error']!();
    handlers['ready']!();
    expect(onErr).toHaveBeenCalledTimes(1);
    expect(ready).toHaveBeenCalledTimes(1);
  });

  it('skips via onError if the YT ready callback fires without the YT namespace (no permanent hang)', async () => {
    // window.YT is unset, so bindEnded goes through loadYT() and installs the
    // global ready hook. Simulate the IFrame API firing ready before it has
    // populated window.YT — the promise must reject (skip now), not hang.
    const onErr = vi.fn();
    bindEnded(document.createElement('iframe'), 'youtube', vi.fn(), { onError: onErr });
    expect(typeof window.onYouTubeIframeAPIReady).toBe('function');
    window.onYouTubeIframeAPIReady!(); // window.YT still undefined
    await Promise.resolve();
    await Promise.resolve();
    expect(onErr).toHaveBeenCalledTimes(1);
  });

  it('fires hooks.onError when the Mixcloud ready promise rejects', async () => {
    const widget = { ready: Promise.reject(new Error('embed unavailable')), events: { ended: { on: vi.fn(), off: vi.fn() } } };
    (window as unknown as { Mixcloud: unknown }).Mixcloud = { PlayerWidget: () => widget };
    const onErr = vi.fn();
    bindEnded(document.createElement('iframe'), 'mixcloud', vi.fn(), { onError: onErr });
    await new Promise((r) => setTimeout(r, 0));
    expect(onErr).toHaveBeenCalledTimes(1);
  });

  it('fires onEnded when the Mixcloud widget ends, and unbinds on cleanup', async () => {
    let endedCb: (() => void) | null = null;
    const on = vi.fn((c: () => void) => { endedCb = c; });
    const off = vi.fn();
    const widget = { ready: Promise.resolve(), events: { ended: { on, off } } };
    (window as unknown as { Mixcloud: unknown }).Mixcloud = { PlayerWidget: () => widget };

    const onEnded = vi.fn();
    const { detach } = bindEnded(document.createElement('iframe'), 'mixcloud', onEnded);
    await new Promise((r) => setTimeout(r, 0)); // let widget.ready resolve
    expect(on).toHaveBeenCalledTimes(1);
    endedCb!();
    expect(onEnded).toHaveBeenCalledTimes(1);
    detach();
    expect(off).toHaveBeenCalledTimes(1);
  });

  it('fires hooks.onBlocked when YouTube attaches but never starts (autoplay blocked)', () => {
    vi.useFakeTimers();
    try {
      let onReady: (() => void) | null = null;
      class FakePlayer {
        constructor(_el: unknown, opts: { events: { onReady: () => void } }) { onReady = opts.events.onReady; }
        destroy(): void {}
        playVideo(): void {}
      }
      (window as unknown as { YT: unknown }).YT = { Player: FakePlayer };
      const onBlocked = vi.fn();
      bindEnded(document.createElement('iframe'), 'youtube', vi.fn(), { onBlocked });
      onReady!(); // attached → autoplay grace armed
      expect(onBlocked).not.toHaveBeenCalled();
      vi.advanceTimersByTime(2500);
      expect(onBlocked).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
      delete (window as unknown as { YT?: unknown }).YT;
    }
  });

  it('does not fire onBlocked once playback actually starts', () => {
    vi.useFakeTimers();
    try {
      let onReady: (() => void) | null = null;
      let onState: ((e: { data: number }) => void) | null = null;
      class FakePlayer {
        constructor(_el: unknown, opts: { events: { onReady: () => void; onStateChange: (e: { data: number }) => void } }) {
          onReady = opts.events.onReady; onState = opts.events.onStateChange;
        }
        destroy(): void {}
        playVideo(): void {}
      }
      (window as unknown as { YT: unknown }).YT = { Player: FakePlayer };
      const onBlocked = vi.fn();
      bindEnded(document.createElement('iframe'), 'youtube', vi.fn(), { onBlocked });
      onReady!();
      onState!({ data: 1 }); // PLAYING -> autoplay allowed, grace disarmed
      vi.advanceTimersByTime(2500);
      expect(onBlocked).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
      delete (window as unknown as { YT?: unknown }).YT;
    }
  });

  it('play() resumes the YouTube player (gesture-driven resume)', () => {
    const playVideo = vi.fn();
    class FakePlayer {
      playVideo = playVideo;
      constructor(_el: unknown, _opts: unknown) {}
      destroy(): void {}
    }
    (window as unknown as { YT: unknown }).YT = { Player: FakePlayer };
    try {
      const binding = bindEnded(document.createElement('iframe'), 'youtube', vi.fn());
      binding.play();
      expect(playVideo).toHaveBeenCalledTimes(1);
    } finally {
      delete (window as unknown as { YT?: unknown }).YT;
    }
  });
});
