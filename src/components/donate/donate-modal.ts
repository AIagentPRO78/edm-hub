import './donate-modal.css';
import { DONATION_PRESETS, normalizeAmount } from '../../lib/donate/amount';
import { startCheckout as defaultStartCheckout } from '../../lib/donate/stripe-client';
import { createDialog } from '../../lib/a11y/dialog';

export interface DonateModal {
  el: HTMLElement;
  open(): void;
  close(): void;
}

interface DonateModalConfig {
  currencySymbol?: string;
  /** Injectable for tests; defaults to the real Stripe checkout redirect. */
  startCheckout?: (amount: number) => Promise<void>;
}

const DEFAULT_AMOUNT = DONATION_PRESETS[1] ?? DONATION_PRESETS[0] ?? 1;

export function createDonateModal(config: DonateModalConfig = {}): DonateModal {
  const symbol = config.currencySymbol ?? '$';
  const startCheckout = config.startCheckout ?? defaultStartCheckout;

  let currentAmount: number = DEFAULT_AMOUNT;

  const el = document.createElement('aside');
  el.className = 'donate';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Support the site');

  const panel = document.createElement('div');
  panel.className = 'donate__panel';
  el.append(panel);

  // Focus trap, inert-when-closed, focus restore and Escape are handled here.
  const dialog = createDialog(el);

  const header = document.createElement('div');
  header.className = 'donate__header';
  const title = document.createElement('h2');
  title.className = 'donate__title';
  title.textContent = 'Keep the music playing';
  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'donate__close';
  closeBtn.setAttribute('aria-label', 'Close');
  closeBtn.textContent = '✕';
  closeBtn.addEventListener('click', () => dialog.close());
  header.append(title, closeBtn);

  const blurb = document.createElement('p');
  blurb.className = 'donate__blurb';
  blurb.textContent = 'A one-time tip to cover hosting. Secure card checkout via Stripe.';

  const chips = document.createElement('div');
  chips.className = 'donate__chips';
  chips.setAttribute('role', 'group');
  chips.setAttribute('aria-label', 'Choose an amount');

  const customInput = document.createElement('input');
  customInput.className = 'donate__custom';
  customInput.type = 'number';
  customInput.min = '1';
  customInput.max = '1000';
  customInput.step = '1';
  customInput.placeholder = 'Custom $';
  customInput.setAttribute('aria-label', 'Custom amount in dollars');

  const setActiveChip = (amount: number | null): void => {
    for (const c of chips.querySelectorAll<HTMLButtonElement>('.donate__chip')) {
      c.setAttribute('aria-pressed', String(Number(c.dataset.amount) === amount));
    }
  };

  for (const preset of DONATION_PRESETS) {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'donate__chip';
    chip.dataset.amount = String(preset);
    chip.textContent = `${symbol}${preset}`;
    chip.setAttribute('aria-pressed', String(preset === currentAmount));
    chip.addEventListener('click', () => {
      currentAmount = preset;
      customInput.value = '';
      setActiveChip(preset);
      clearError();
      updatePayLabel();
    });
    chips.append(chip);
  }
  chips.append(customInput);

  customInput.addEventListener('input', () => {
    if (customInput.value.trim() === '') {
      currentAmount = DEFAULT_AMOUNT;
      setActiveChip(DEFAULT_AMOUNT);
      clearError();
      updatePayLabel();
      return;
    }
    const res = normalizeAmount(customInput.value);
    if (res.ok) {
      currentAmount = Number(customInput.value);
      setActiveChip(null);
      clearError();
      updatePayLabel();
    } else {
      showError(res.error ?? 'Enter a valid amount');
    }
  });

  const errorEl = document.createElement('p');
  errorEl.className = 'donate__error';
  errorEl.setAttribute('role', 'alert');

  const payBtn = document.createElement('button');
  payBtn.type = 'button';
  payBtn.className = 'donate__pay';

  const secure = document.createElement('p');
  secure.className = 'donate__secure';
  secure.textContent = 'Powered by Stripe · cards, Apple Pay & Google Pay';

  panel.append(header, blurb, chips, errorEl, payBtn, secure);

  function updatePayLabel(): void {
    payBtn.textContent = `Donate ${symbol}${currentAmount}`;
  }
  function showError(msg: string): void {
    errorEl.textContent = msg;
  }
  function clearError(): void {
    errorEl.textContent = '';
  }

  updatePayLabel();

  payBtn.addEventListener('click', async () => {
    const norm = normalizeAmount(currentAmount);
    if (!norm.ok) {
      showError(norm.error ?? 'Enter a valid amount');
      return;
    }
    payBtn.disabled = true;
    payBtn.textContent = 'Redirecting to checkout…';
    try {
      await startCheckout(currentAmount);
    } catch {
      showError('Could not start checkout. Please try again.');
      payBtn.disabled = false;
      updatePayLabel();
    }
  });

  el.addEventListener('click', (e) => {
    if (e.target === el) dialog.close();
  });

  return { el, open: dialog.open, close: dialog.close };
}
