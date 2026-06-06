export function soundcloudEmbedSrc(ref: string, autoplay = true): string {
  const params = new URLSearchParams({
    url: ref,
    auto_play: autoplay ? 'true' : 'false',
    hide_related: 'true',
    show_comments: 'false',
    show_user: 'true',
    show_reposts: 'false',
    visual: 'true',
    color: 'ff2bd6',
  });
  return `https://w.soundcloud.com/player/?${params.toString()}`;
}
