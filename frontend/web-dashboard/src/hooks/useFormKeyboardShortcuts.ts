import { useEffect } from 'react';

interface FormKeyboardShortcutsOptions {
  onSave?: () => void;
  onCancel?: () => void;
  onNewRow?: () => void;
  isEnabled?: boolean;
  isSubmitting?: boolean;
  enterToNextField?: boolean;
}

/**
 * Custom React hook for standard ERP keyboard shortcuts in form views & modals.
 *
 * Supported Shortcuts:
 * - Ctrl + S / Cmd + S: Save / Submit Form
 * - Esc: Cancel / Close Modal / Go Back
 * - Alt + N: Add New Row / Line Item (if applicable)
 * - Enter: (Optional) Focus next form field instead of instant submit
 */
export function useFormKeyboardShortcuts({
  onSave,
  onCancel,
  onNewRow,
  isEnabled = true,
  isSubmitting = false,
  enterToNextField = false,
}: FormKeyboardShortcutsOptions) {
  useEffect(() => {
    if (!isEnabled) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const isCmdOrCtrl = event.ctrlKey || event.metaKey;
      const key = event.key.toLowerCase();
      const target = event.target as HTMLElement | null;
      const isInputFocused =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT' ||
          target.isContentEditable);

      // 1. Ctrl+S or Cmd+S -> Save Form
      if (isCmdOrCtrl && key === 's') {
        event.preventDefault();
        event.stopPropagation();
        if (onSave && !isSubmitting) {
          onSave();
        }
        return;
      }

      // 2. Esc -> Cancel / Close
      if (key === 'escape') {
        // If an input dropdown/combobox is open, let native escape close it first if needed,
        // otherwise trigger onCancel.
        if (onCancel) {
          event.stopPropagation();
          onCancel();
        }
        return;
      }

      // 3. Alt+N -> Add New Row
      if (event.altKey && key === 'n') {
        event.preventDefault();
        if (onNewRow) {
          onNewRow();
        }
        return;
      }

      // 4. Enter -> Move to next field (ERP Style) if requested
      if (enterToNextField && key === 'enter' && isInputFocused) {
        // Don't intercept Enter in textareas or submit buttons
        if (target.tagName === 'TEXTAREA' || (target as HTMLInputElement).type === 'submit') {
          return;
        }

        const form = target.closest('form');
        if (form) {
          const focusable = Array.from(
            form.querySelectorAll<HTMLElement>(
              'input:not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])'
            )
          ).filter((el) => el.offsetWidth > 0 || el.offsetHeight > 0);

          const index = focusable.indexOf(target);
          if (index > -1 && index < focusable.length - 1) {
            event.preventDefault();
            focusable[index + 1].focus();
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [onSave, onCancel, onNewRow, isEnabled, isSubmitting, enterToNextField]);
}
