import './donate-modal.css';
import { DONATION_PRESETS, normalizeAmount } from '../../lib/donate/amount';
import {
  loadPayPal,
  type PayPalNamespace,
  type PayPalButtonsInstance,
  type PayPalOrderActions,
} from '../../lib/donate/paypal';

export interface DonateModal {
  el: HTMLElement;
  open(): Promise<void>;
  close(): void;
}

interface DonateModalConfig {
  clientId?: string;
  currency?: string;
  loadPayPal?: (clientId: string, currency: string) => Promise<PayPalNamespace>;
}

const DEFAULT_AMOUNT = DONATION_PRESETS[1] ?? DONATION_PRESETS[0] ?? 1;

export function createDonateModal(config: DonateModalConfig = {}): DonateModal {
  const clientId = config.clientId ?? import.meta.env.VITE_PAYPAL_CLIENT_ID ?? '';
  const currency = config.currency ?? import.meta.env.VITE_PAYPAL_CURRENCY ?? 'USD';
  const load = config.loadPayPal ?? loadPayPal;

  let currentAmount: number = DEFAULT_AMOUNT;
  let paypalNs: PayPalNamespace | null = null;
  let buttonsInstance: PayPalButtonsInstance | null = null;
  let refreshTimer: ReturnType<typeof setTimeout> | null = null;

  const el = document.createElement('aside');
  el.className = 'donate';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-modal', 'true');
  el.setAttribute('aria-label', 'Support the site');
  el.setAttribute('aria-hidden', 'true');

  const panel = document.createElement('div');
  panel.className = 'donate__panel';
  el.append(panel);

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
  closeBtn.addEventListener('click', () => close());
  header.append(title, closeBtn);

  const blurb = document.createElement('p');
  blurb.className = 'donate__blurb';
  blurb.textContent = 'A one-time tip to cover hosting. Secure checkout via PayPal — card or PayPal balance.';

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
  customInput.setAttribute('aria-label', 'Custom amount in US dollars');

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
    chip.textContent = `$${preset}`;
    chip.setAttribute('aria-pressed', String(preset === currentAmount));
    chip.addEventListener('click', () => {
      currentAmount = preset;
      customInput.value = '';
      setActiveChip(preset);
      clearError();
      scheduleRebuild();
    });
    chips.append(chip);
  }
  chips.append(customInput);

  customInput.addEventListener('input', () => {
    if (customInput.value.trim() === '') {
      currentAmount = DEFAULT_AMOUNT;
      setActiveChip(DEFAULT_AMOUNT);
      clearError();
      scheduleRebuild();
      return;
    }
    const res = normalizeAmount(customInput.value);
    if (res.ok) {
      currentAmount = Number(customInput.value);
      setActiveChip(null);
      clearError();
      scheduleRebuild();
    } else {
      showError(res.error ?? 'Enter a valid amount');
    }
  });

  const errorEl = document.createElement('p');
  errorEl.className = 'donate__error';
  errorEl.setAttribute('role', 'alert');

  const paypalSlot = document.createElement('div');
  paypalSlot.className = 'donate__paypal';

  const status = document.createElement('div');
  status.className = 'donate__status';

  panel.append(header, blurb, chips, errorEl, paypalSlot, status);

  function showError(msg: string): void {
    errorEl.textContent = msg;
  }
  function clearError(): void {
    errorEl.textContent = '';
  }
  function showSuccess(): void {
    paypalSlot.replaceChildren();
    chips.style.display = 'none';
    blurb.style.display = 'none';
    const ok = document.createElement('div');
    ok.className = 'donate__success';
    ok.textContent = 'Thank you — the music plays on 🔊';
    status.replaceChildren(ok);
  }
  function showFatal(msg: string): void {
    const f = document.createElement('div');
    f.className = 'donate__fatal';
    f.textContent = msg;
    status.replaceChildren(f);
  }

  el.addEventListener('click', (e) => {
    if (e.target === el) close();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && el.getAttribute('aria-hidden') === 'false') close();
  });

  function buildButtons(paypal: PayPalNamespace): Promise<void> {
    paypalSlot.replaceChildren();
    buttonsInstance = paypal.Buttons({
      style: { layout: 'vertical', color: 'gold', shape: 'pill', label: 'paypal' },
      createOrder: (_data: unknown, actions: PayPalOrderActions) => {
        const amt = normalizeAmount(currentAmount);
        return actions.order.create({
          intent: 'CAPTURE',
          purchase_units: [
            {
              amount: { value: amt.ok ? amt.value : DEFAULT_AMOUNT.toFixed(2), currency_code: currency },
              description: 'DJ SET — supporter tip',
            },
          ],
        });
      },
      onApprove: async (_data: unknown, actions: PayPalOrderActions) => {
        await actions.order.capture();
        showSuccess();
      },
      onError: (err: unknown) => {
        console.error('[donate] PayPal button error', err);
        showError('Payment could not be completed. Please try again.');
      },
    });
    return buttonsInstance.render(paypalSlot);
  }

  // Re-render the buttons whenever the amount changes so the order always
  // reflects the current selection. PayPal's card form locks the amount when it
  // opens, so a stale form must be torn down when the user picks a new amount.
  async function rebuild(): Promise<void> {
    if (!paypalNs) return;
    try {
      if (buttonsInstance) await buttonsInstance.close();
    } catch {
      /* already closed */
    }
    buttonsInstance = null;
    try {
      await buildButtons(paypalNs);
    } catch (err) {
      console.error('[donate] PayPal render failed', err);
      showFatal('Could not load the PayPal buttons. Please try again.');
    }
  }

  function scheduleRebuild(): void {
    if (!paypalNs) return;
    if (refreshTimer) clearTimeout(refreshTimer);
    refreshTimer = setTimeout(() => { void rebuild(); }, 300);
  }

  async function ensureLoaded(): Promise<void> {
    if (paypalNs) return;
    if (!clientId) {
      showFatal('Donations are temporarily unavailable.');
      return;
    }
    try {
      paypalNs = await load(clientId, currency);
    } catch {
      showFatal('Could not load PayPal. Please try again later.');
      return;
    }
    try {
      await buildButtons(paypalNs);
    } catch (err) {
      console.error('[donate] PayPal render failed', err);
      showFatal('Could not load the PayPal buttons. Please try again.');
    }
  }

  function open(): Promise<void> {
    el.setAttribute('aria-hidden', 'false');
    return ensureLoaded();
  }
  function close(): void {
    el.setAttribute('aria-hidden', 'true');
  }

  return { el, open, close };
}
