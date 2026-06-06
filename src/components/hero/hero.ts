import './hero.css';

export interface HeroHandlers {
  onStart: () => void;
  onShuffle: () => void;
}

export function createHero({ onStart, onShuffle }: HeroHandlers): HTMLElement {
  const hero = document.createElement('header');
  hero.className = 'hero';

  hero.innerHTML = `
    <div class="hero__glow" aria-hidden="true"></div>
    <div class="hero__beams" aria-hidden="true"></div>
    <div class="hero__content">
      <p class="hero__eyebrow">THE WORLD'S</p>
      <h1 class="hero__logo">DJ SET</h1>
      <p class="hero__tagline">EDM · TRANCE · ONE WALL · PRESS PLAY</p>
      <div class="hero__cta">
        <button class="hero__btn hero__btn--primary" data-action="start">▶ Start the set</button>
        <button class="hero__btn hero__btn--ghost" data-action="shuffle">Shuffle all</button>
      </div>
    </div>
  `;

  hero.querySelector<HTMLButtonElement>('[data-action="start"]')!.addEventListener('click', onStart);
  hero.querySelector<HTMLButtonElement>('[data-action="shuffle"]')!.addEventListener('click', onShuffle);
  return hero;
}
