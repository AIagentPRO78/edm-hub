export function mixcloudEmbedSrc(ref: string, autoplay = true): string {
  const params = new URLSearchParams({
    feed: ref,
    hide_cover: '1',
    light: '0',
    autoplay: autoplay ? '1' : '0',
  });
  return `https://www.mixcloud.com/widget/iframe/?${params.toString()}`;
}
