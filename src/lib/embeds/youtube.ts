export function youtubeEmbedSrc(ref: string, autoplay = true): string {
  const params = new URLSearchParams({
    autoplay: autoplay ? '1' : '0',
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
  });
  return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(ref)}?${params.toString()}`;
}
