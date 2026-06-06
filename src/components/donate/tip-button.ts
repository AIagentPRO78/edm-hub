import './tip-button.css';

export type TipVariant = 'deck' | 'footer';

export function createTipButton(onClick: () => void, variant: TipVariant = 'deck'): HTMLButtonElement {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `tip-button tip-button--${variant}`;
  btn.setAttribute('aria-label', 'Support the site — leave a tip');

  const heart = document.createElement('span');
  heart.className = 'tip-button__heart';
  heart.setAttribute('aria-hidden', 'true');
  heart.textContent = '♥';

  const label = document.createElement('span');
  label.className = 'tip-button__label';
  label.textContent = 'Tip';

  btn.append(heart, label);
  btn.addEventListener('click', onClick);
  return btn;
}
