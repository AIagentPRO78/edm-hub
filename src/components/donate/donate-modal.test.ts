import { describe, it, expect, beforeEach } from 'vitest';
import { createDonateModal } from './donate-modal';
import type { PayPalNamespace } from '../../lib/donate/paypal';

function fakePayPal(): PayPalNamespace {
  return {
    Buttons: () => ({
      render: (container: HTMLElement) => {
        const b = document.createElement('div');
        b.className = 'fake-paypal-button';
        container.appendChild(b);
        return Promise.resolve();
      },
    }),
  };
}

const withFake = () =>
  createDonateModal({ clientId: 'test', loadPayPal: () => Promise.resolve(fakePayPal()) });

describe('createDonateModal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('is hidden until opened', () => {
    expect(withFake().el.getAttribute('aria-hidden')).toBe('true');
  });

  it('renders three preset chips and a custom input', () => {
    const el = withFake().el;
    expect(el.querySelectorAll('.donate__chip').length).toBe(3);
    expect(el.querySelector('.donate__custom')).not.toBeNull();
  });

  it('defaults the active chip to $3', () => {
    const active = withFake().el.querySelector('.donate__chip[aria-pressed="true"]') as HTMLButtonElement;
    expect(active.dataset.amount).toBe('3');
  });

  it('mounts the PayPal buttons into the modal on open', async () => {
    const m = withFake();
    document.body.append(m.el);
    await m.open();
    expect(m.el.getAttribute('aria-hidden')).toBe('false');
    expect(m.el.querySelector('.donate__paypal .fake-paypal-button')).not.toBeNull();
  });

  it('shows a fallback when no client id is configured', async () => {
    const m = createDonateModal({ clientId: '', loadPayPal: () => Promise.resolve(fakePayPal()) });
    await m.open();
    expect(m.el.querySelector('.donate__fatal')).not.toBeNull();
  });

  it('hides again on close', async () => {
    const m = withFake();
    await m.open();
    m.close();
    expect(m.el.getAttribute('aria-hidden')).toBe('true');
  });
});
