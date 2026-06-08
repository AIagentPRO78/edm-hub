import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createDialog } from './dialog';

function buildDialog() {
  const el = document.createElement('div');
  el.setAttribute('role', 'dialog');
  const btnFirst = document.createElement('button');
  btnFirst.textContent = 'first';
  const input = document.createElement('input');
  const btnLast = document.createElement('button');
  btnLast.textContent = 'last';
  el.append(btnFirst, input, btnLast);
  document.body.append(el);
  const dialog = createDialog(el);
  return { el, btnFirst, input, btnLast, dialog };
}

describe('createDialog', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('starts hidden and inert', () => {
    const { el } = buildDialog();
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.inert).toBe(true);
  });

  it('open() shows, un-inerts, and moves focus to the first focusable', () => {
    const { el, btnFirst, dialog } = buildDialog();
    dialog.open();
    expect(el.getAttribute('aria-hidden')).toBe('false');
    expect(el.inert).toBe(false);
    expect(document.activeElement).toBe(btnFirst);
    expect(dialog.isOpen).toBe(true);
  });

  it('close() hides, re-inerts, and restores focus to the trigger', () => {
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();
    const { el, dialog } = buildDialog();
    dialog.open();
    dialog.close();
    expect(el.getAttribute('aria-hidden')).toBe('true');
    expect(el.inert).toBe(true);
    expect(document.activeElement).toBe(trigger);
    expect(dialog.isOpen).toBe(false);
  });

  it('Escape closes the open dialog', () => {
    const { el, dialog } = buildDialog();
    dialog.open();
    el.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(dialog.isOpen).toBe(false);
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });

  it('wraps Tab from the last focusable back to the first', () => {
    const { el, btnFirst, btnLast, dialog } = buildDialog();
    dialog.open();
    btnLast.focus();
    const ev = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    el.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(btnFirst);
  });

  it('wraps Shift+Tab from the first focusable to the last', () => {
    const { el, btnFirst, btnLast, dialog } = buildDialog();
    dialog.open();
    btnFirst.focus();
    const ev = new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true });
    el.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(btnLast);
  });

  it('moves Tab focus to the next focusable mid-list (does not rely on native tabbing)', () => {
    const { el, input, btnLast, dialog } = buildDialog();
    dialog.open();
    input.focus();
    const ev = new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true });
    el.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(btnLast);
  });

  it('fires onOpen and onClose callbacks', () => {
    const onOpen = vi.fn();
    const onClose = vi.fn();
    const el = document.createElement('div');
    el.append(document.createElement('button'));
    document.body.append(el);
    const dialog = createDialog(el, { onOpen, onClose });
    dialog.open();
    expect(onOpen).toHaveBeenCalledTimes(1);
    dialog.close();
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('is idempotent — double open / double close do not re-fire', () => {
    const onOpen = vi.fn();
    const onClose = vi.fn();
    const { dialog } = (() => {
      const el = document.createElement('div');
      el.append(document.createElement('button'));
      document.body.append(el);
      return { dialog: createDialog(el, { onOpen, onClose }) };
    })();
    dialog.open();
    dialog.open();
    dialog.close();
    dialog.close();
    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
