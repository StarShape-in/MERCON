import { useEffect, useRef, ReactNode } from 'react';
import { useLayoutMeta, LayoutMeta } from '@/context/LayoutContext';

/**
 * Call this at the top of any page component to set the shell's
 * title, active sidebar item, breadcrumb, and action buttons.
 *
 * The layout shell stays mounted; only the metadata values update.
 */
export function usePageMeta(meta: LayoutMeta) {
  const { setMeta } = useLayoutMeta();

  // Use a ref so the effect dependency doesn't change on every render
  // when the caller passes inline objects/JSX for `actions` / `pageTitle`.
  const metaRef = useRef(meta);
  metaRef.current = meta;

  useEffect(() => {
    setMeta(metaRef.current);
    // We intentionally only re-run when the primitive values change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meta.active, meta.title, meta.breadcrumb, meta.pageSub]);
}
