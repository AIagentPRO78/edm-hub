import type { Artist, Track } from '../types';

export interface PlayerState {
  artist: Artist | null;
  track: Track | null;
}

type Listener = (state: PlayerState) => void;

export function createPlayer() {
  let state: PlayerState = { artist: null, track: null };
  const listeners = new Set<Listener>();

  const emit = () => {
    for (const l of listeners) l(state);
  };

  return {
    get state(): PlayerState {
      return state;
    },
    subscribe(listener: Listener): () => void {
      listeners.add(listener);
      listener(state);
      return () => {
        listeners.delete(listener);
      };
    },
    play(artist: Artist, track: Track): void {
      state = { artist, track };
      emit();
    },
    clear(): void {
      state = { artist: null, track: null };
      emit();
    },
  };
}

export type Player = ReturnType<typeof createPlayer>;
