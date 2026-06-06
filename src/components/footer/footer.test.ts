import { describe, it, expect, vi } from 'vitest';
import { createFooter } from './footer';

describe('createFooter', () => {
  it('renders a footer with a tip button and the embed disclaimer', () => {
    const el = createFooter(() => {});
    expect(el.tagName).toBe('FOOTER');
    expect(el.querySelector('.tip-button')).not.toBeNull();
    expect(el.textContent).toContain('official');
    expect(el.textContent).toContain('not a charitable donation');
  });

  it('forwards tip clicks', () => {
    const onTip = vi.fn();
    const el = createFooter(onTip);
    (el.querySelector('.tip-button') as HTMLButtonElement).click();
    expect(onTip).toHaveBeenCalledTimes(1);
  });
});
