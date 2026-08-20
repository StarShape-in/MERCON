import { useEffect } from 'react';

interface GridKeyboardNavigationOptions {
  containerRef: React.RefObject<HTMLElement | null>;
  rowCount: number;
  onAddRow?: () => void;
  onDeleteRow?: (index: number) => void;
  isEnabled?: boolean;
}

/**
 * Custom React hook for keyboard navigation inside table grids & line-item ledgers.
 *
 * Supported Shortcuts:
 * - Enter on last cell of row -> Appends new row and moves focus
 * - Alt + D / Shift + Delete -> Deletes active row
 * - ArrowUp / ArrowDown -> Navigates vertically between table rows
 */
export function useGridKeyboardNavigation({
  containerRef,
  rowCount,
  onAddRow,
  onDeleteRow,
  isEnabled = true,
}: GridKeyboardNavigationOptions) {
  useEffect(() => {
    if (!isEnabled || !containerRef.current) return;

    const container = containerRef.current;

    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target || !container.contains(target)) return;

      const isInput =
        target.tagName === 'INPUT' || target.tagName === 'SELECT' || target.tagName === 'TEXTAREA';
      if (!isInput) return;

      const rowElement = target.closest('[data-row-index]') as HTMLElement | null;
      if (!rowElement) return;

      const rowIndexAttr = rowElement.getAttribute('data-row-index');
      if (rowIndexAttr === null) return;
      const rowIndex = parseInt(rowIndexAttr, 10);

      const key = event.key.toLowerCase();

      // 1. Alt + D or Shift + Delete -> Delete Row
      if ((event.altKey && key === 'd') || (event.shiftKey && key === 'delete')) {
        event.preventDefault();
        if (onDeleteRow && !isNaN(rowIndex)) {
          onDeleteRow(rowIndex);
        }
        return;
      }

      // 2. Enter on last focusable element in row -> Add Row
      if (key === 'enter' && target.tagName !== 'TEXTAREA') {
        const rowInputs = Array.from(
          rowElement.querySelectorAll<HTMLElement>('input:not([disabled]), select:not([disabled])')
        );
        const lastInputInRow = rowInputs[rowInputs.length - 1];

        if (target === lastInputInRow && rowIndex === rowCount - 1) {
          event.preventDefault();
          if (onAddRow) {
            onAddRow();
          }
          return;
        }
      }

      // 3. ArrowUp / ArrowDown Navigation
      if (key === 'arrowup' || key === 'arrowdown') {
        const colIndexAttr = target.getAttribute('data-col-index');
        if (colIndexAttr !== null) {
          const colIndex = parseInt(colIndexAttr, 10);
          const targetRowIndex = key === 'arrowup' ? rowIndex - 1 : rowIndex + 1;
          const targetRow = container.querySelector(
            `[data-row-index="${targetRowIndex}"]`
          ) as HTMLElement | null;

          if (targetRow) {
            const targetCell = targetRow.querySelector(
              `[data-col-index="${colIndex}"]`
            ) as HTMLElement | null;
            if (targetCell) {
              event.preventDefault();
              targetCell.focus();
            }
          }
        }
      }
    };

    container.addEventListener('keydown', handleKeyDown);
    return () => {
      container.removeEventListener('keydown', handleKeyDown);
    };
  }, [containerRef, rowCount, onAddRow, onDeleteRow, isEnabled]);
}
