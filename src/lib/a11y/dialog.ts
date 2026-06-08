/**
 * Modal a11y controller for an overlay element. Adds the behaviour a real dialog
 * needs but that aria-hidden + CSS alone do not provide:
 *
 *  - inert when closed, so the panel's controls leave the tab order entirely
 *    (aria-hidden hides from AT but leaves <button>s keyboard-reachable);
 *  - focus moved into the panel on open and restored to the trigger on close;
 *  - a Tab / Shift+Tab wrap so focus cannot escape the open dialog;
 *  - Escape to close.
 *
 * Visibility is still driven by aria-hidden (the existing component CSS keys off
 * [aria-hidden='true']); this controller owns that attribute plus inert + focus.
 */

const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

export interface DialogController {
  open(): void;
  close(): void;
  readonly isOpen: boolean;
}

export interface DialogOptions {
  /** Runs after the dialog is shown, before focus moves in (e.g. render content). */
  onOpen?: () => void;
  /** Runs after the dialog is hidden. */
  onClose?: () => void;
  /** Element to focus on open; defaults to the first focusable in the dialog. */
  initialFocus?: () => HTMLElement | null;
}

export function createDialog(el: HTMLElement, opts: DialogOptions = {}): DialogController {
  let open = false;
  let trigger: HTMLElement | null = null;

  // Closed by default: hidden from AT and pulled out of the tab order.
  el.setAttribute('aria-hidden', 'true');
  el.inert = true;

  const focusables = (): HTMLElement[] =>
    Array.from(el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));

  function show(): void {
    if (open) return;
    trigger = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    el.inert = false;
    el.setAttribute('aria-hidden', 'false');
    open = true;
    opts.onOpen?.();
    const target = opts.initialFocus?.() ?? focusables()[0] ?? el;
    target.focus();
  }

  function hide(): void {
    if (!open) return;
    open = false;
    el.setAttribute('aria-hidden', 'true');
    el.inert = true;
    opts.onClose?.();
    trigger?.focus?.();
    trigger = null;
  }

  el.addEventListener('keydown', (e: KeyboardEvent) => {
    if (!open) return;
    if (e.key === 'Escape') {
      e.preventDefault();
      hide();
      return;
    }
    if (e.key !== 'Tab') return;
    const items = focusables();
    if (items.length === 0) {
      e.preventDefault();
      return;
    }
    // Fully manage Tab rather than leaning on native tabbing: this keeps the
    // trap working in WebKit/Safari, which by default does not move Tab focus to
    // buttons (Full Keyboard Access off) and would otherwise let focus escape.
    e.preventDefault();
    const current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const idx = current ? items.indexOf(current) : -1;
    let next: HTMLElement;
    if (e.shiftKey) {
      next = idx <= 0 ? items[items.length - 1]! : items[idx - 1]!;
    } else {
      next = idx === -1 || idx === items.length - 1 ? items[0]! : items[idx + 1]!;
    }
    next.focus();
  });

  return {
    open: show,
    close: hide,
    get isOpen() {
      return open;
    },
  };
}
