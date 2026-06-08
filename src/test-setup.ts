// jsdom does not implement ResizeObserver, but the deck bar uses one to mirror
// its height into --deck-h. Provide a no-op stub so component tests can mount it.
if (!('ResizeObserver' in globalThis)) {
  class ResizeObserverStub {
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
  }
  (globalThis as typeof globalThis & { ResizeObserver: typeof ResizeObserver }).ResizeObserver =
    ResizeObserverStub as unknown as typeof ResizeObserver;
}
