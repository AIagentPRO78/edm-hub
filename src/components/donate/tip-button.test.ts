import { describe, it, expect, vi } from 'vitest';
import { createTipButton } from './tip-button';

describe('createTipButton', () => {
  it('renders a button with a heart and a label', () => {
    const el = createTipButton(() => {});
    expect(el.tagName).toBe('BUTTON');
    expect(el.textContent).toContain('♥');
    expect(el.textContent).toContain('Tip');
  });

  it('calls the handler on click', () => {
    const onClick = vi.fn();
    createTipButton(onClick).click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('applies the variant class', () => {
    expect(createTipButton(() => {}, 'footer').className).toContain('tip-button--footer');
    expect(createTipButton(() => {}, 'deck').className).toContain('tip-button--deck');
  });
});
