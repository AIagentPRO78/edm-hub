import { describe, it, expect, vi, afterEach } from 'vitest';
import { bindEnded } from './playback';

afterEach(() => {
  delete (window as unknown as { SC?: unknown }).SC;
  delete (window as unknown as { YT?: unknown }).YT;
});

describe('bindEnded', () => {
  it('fires onEnded on a SoundCloud FINISH event and unbinds on cleanup', () => {
    let cb: (() => void) | null = null;
    const bind = vi.fn((_e: unknown, c: () => void) => { cb = c; });
    const unbind = vi.fn();
    const Widget = Object.assign(() => ({ bind, unbind }), { Events: { FINISH: 'finish' } });
    (window as unknown as { SC: unknown }).SC = { Widget };

    const onEnded = vi.fn();
    const cleanup = bindEnded(document.createElement('iframe'), 'soundcloud', onEnded);
    expect(bind).toHaveBeenCalledTimes(1);
    cb!();
    expect(onEnded).toHaveBeenCalledTimes(1);
    cleanup();
    expect(unbind).toHaveBeenCalledTimes(1);
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
});
