/**
 * Rewrite a googleusercontent avatar URL to the size the wall tiles actually
 * render. The seed stores `=s400-` (400px), but tiles paint at ~180px CSS, so
 * 360px (180 * 2 DPR) is plenty and saves a large amount of image transfer.
 * URLs without a `=sNNN-` size segment are returned unchanged.
 */
export function avatarSrc(url: string): string {
  return url.replace(/=s\d+-/, '=s360-');
}
