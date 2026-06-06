import type { Track } from '../../types';
import { youtubeEmbedSrc } from './youtube';
import { soundcloudEmbedSrc } from './soundcloud';
import { mixcloudEmbedSrc } from './mixcloud';

export function embedSrc(track: Track, autoplay = true): string {
  switch (track.platform) {
    case 'youtube':
      return youtubeEmbedSrc(track.ref, autoplay);
    case 'soundcloud':
      return soundcloudEmbedSrc(track.ref, autoplay);
    case 'mixcloud':
      return mixcloudEmbedSrc(track.ref, autoplay);
  }
}
