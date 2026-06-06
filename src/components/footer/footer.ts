import './footer.css';
import { createTipButton } from '../donate/tip-button';

export function createFooter(onTip: () => void): HTMLElement {
  const footer = document.createElement('footer');
  footer.className = 'site-footer';

  const inner = document.createElement('div');
  inner.className = 'site-footer__inner';

  const heading = document.createElement('p');
  heading.className = 'site-footer__heading';
  heading.textContent = 'Keep the music playing';

  const note = document.createElement('p');
  note.className = 'site-footer__note';
  note.textContent =
    'Music streams via official SoundCloud, YouTube, and Mixcloud embeds. Not affiliated with the artists. Tips are voluntary support for hosting, not a charitable donation.';

  inner.append(heading, createTipButton(onTip, 'footer'), note);
  footer.append(inner);
  return footer;
}
