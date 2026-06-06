import './donate-modal.css';
import { DONATION_PRESETS, normalizeAmount } from '../../lib/donate/amount';
import { loadPayPal, type PayPalNamespace, type PayPalOrderActions } from '../../lib/donate/paypal';

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

const DEFAULT_AMOUNT = 3;

export function createDonateModal(config: DonateModalConfig = {}): DonateModal {
  const clientId = config.clientId ?? (import.meta.env.VITE_PAYPAL_CLIENT_ID as string | undefined) ?? '';
  const currency = config.currency ?? (import.meta.env.VITE_PAYPAL_CURRENCY as string | undefined) ?? 'USD';
  const load = config.loadPayPal ?? loadPayPal;

  let currentAmount = DEFAULT_AMOUNT;
  let buttonsRendered = false;

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
    });
    chips.append(chip);
  }
  chips.append(customInput);

  customInput.addEventListener('input', () => {
    if (customInput.value.trim() === '') {
      setActiveChip(currentAmount);
      clearError();
      return;
    }
    const res = normalizeAmount(customInput.value);
    if (res.ok) {
      currentAmount = Number(customInput.value);
      setActiveChip(null);
      clearError();
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

  async function ensureButtons(): Promise<void> {
    if (buttonsRendered) return;
    if (!clientId) {
      showFatal('Donations are temporarily unavailable.');
      return;
    }
    let paypal: PayPalNamespace;
    try {
      paypal = await load(clientId, currency);
    } catch {
      showFatal('Could not load PayPal. Please try again later.');
      return;
    }
    buttonsRendered = true;
    await paypal
      .Buttons({
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
        onError: () => {
          showError('Payment could not be completed. Please try again.');
        },
      })
      .render(paypalSlot);
  }

  function open(): Promise<void> {
    el.setAttribute('aria-hidden', 'false');
    return ensureButtons();
  }
  function close(): void {
    el.setAttribute('aria-hidden', 'true');
  }

  return { el, open, close };
}
