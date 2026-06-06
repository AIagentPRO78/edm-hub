import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createDonateModal } from './donate-modal';

const withSpy = () => {
  const startCheckout = vi.fn((_a: number) => Promise.resolve());
  const m = createDonateModal({ startCheckout });
  return { m, startCheckout };
};

describe('createDonateModal', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('is hidden until opened, shown after open()', () => {
    const { m } = withSpy();
    expect(m.el.getAttribute('aria-hidden')).toBe('true');
    m.open();
    expect(m.el.getAttribute('aria-hidden')).toBe('false');
  });

  it('renders three preset chips and a custom input', () => {
    const { m } = withSpy();
    expect(m.el.querySelectorAll('.donate__chip').length).toBe(3);
    expect(m.el.querySelector('.donate__custom')).not.toBeNull();
  });

  it('defaults the active chip and pay label to $3', () => {
    const { m } = withSpy();
    const active = m.el.querySelector('.donate__chip[aria-pressed="true"]') as HTMLButtonElement;
    expect(active.dataset.amount).toBe('3');
    expect((m.el.querySelector('.donate__pay') as HTMLButtonElement).textContent).toBe('Donate $3');
  });

  it('updates the pay label when a chip is selected', () => {
    const { m } = withSpy();
    (m.el.querySelector('.donate__chip[data-amount="5"]') as HTMLButtonElement).click();
    expect((m.el.querySelector('.donate__pay') as HTMLButtonElement).textContent).toBe('Donate $5');
  });

  it('starts checkout with the selected preset amount', () => {
    const { m, startCheckout } = withSpy();
    (m.el.querySelector('.donate__chip[data-amount="5"]') as HTMLButtonElement).click();
    (m.el.querySelector('.donate__pay') as HTMLButtonElement).click();
    expect(startCheckout).toHaveBeenCalledWith(5);
  });

  it('starts checkout with a valid custom amount', () => {
    const { m, startCheckout } = withSpy();
    const custom = m.el.querySelector('.donate__custom') as HTMLInputElement;
    custom.value = '20';
    custom.dispatchEvent(new Event('input'));
    (m.el.querySelector('.donate__pay') as HTMLButtonElement).click();
    expect(startCheckout).toHaveBeenCalledWith(20);
  });

  it('resets to the default $3 when a custom amount is cleared', () => {
    const { m } = withSpy();
    const custom = m.el.querySelector('.donate__custom') as HTMLInputElement;
    custom.value = '42';
    custom.dispatchEvent(new Event('input'));
    expect(m.el.querySelector('.donate__chip[aria-pressed="true"]')).toBeNull();
    custom.value = '';
    custom.dispatchEvent(new Event('input'));
    const active = m.el.querySelector('.donate__chip[aria-pressed="true"]') as HTMLButtonElement;
    expect(active.dataset.amount).toBe('3');
  });

  it('shows an error if checkout fails', async () => {
    const startCheckout = vi.fn((_a: number) => Promise.reject(new Error('nope')));
    const m = createDonateModal({ startCheckout });
    (m.el.querySelector('.donate__pay') as HTMLButtonElement).click();
    await new Promise((r) => setTimeout(r, 0));
    expect(m.el.querySelector('.donate__error')!.textContent).toBeTruthy();
    expect((m.el.querySelector('.donate__pay') as HTMLButtonElement).disabled).toBe(false);
  });

  it('hides again on close', () => {
    const { m } = withSpy();
    m.open();
    m.close();
    expect(m.el.getAttribute('aria-hidden')).toBe('true');
  });
});
