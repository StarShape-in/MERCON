import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from 'react';

export interface LayoutMeta {
  active: string;
  title: string;
  breadcrumb?: string;
  pageTitle?: ReactNode;
  pageSub?: string;
  actions?: ReactNode;
  hideBackButton?: boolean;
  hideHeader?: boolean;
  onBackClick?: () => void;
  /** When true, the AppShell content area switches to overflow-hidden for a locked one-page viewport */
  fixedViewport?: boolean;
}

interface LayoutContextValue {
  meta: LayoutMeta;
  setMeta: (meta: LayoutMeta) => void;
  /** True when AppShell is the parent — DashboardLayout should not render its own shell */
  isInsideShell: boolean;
}

const defaultMeta: LayoutMeta = { active: '', title: '' };

const LayoutContext = createContext<LayoutContextValue>({
  meta: defaultMeta,
  setMeta: () => {},
  isInsideShell: false,
});

export function LayoutProvider({ children }: { children: ReactNode }) {
  const [meta, setMetaState] = useState<LayoutMeta>(defaultMeta);

  const setMeta = useCallback((m: LayoutMeta) => {
    setMetaState((prev) => {
      if (
        prev.active === m.active &&
        prev.title === m.title &&
        prev.breadcrumb === m.breadcrumb &&
        prev.hideBackButton === m.hideBackButton &&
        prev.pageSub === m.pageSub &&
        prev.pageTitle === m.pageTitle &&
        prev.actions === m.actions &&
        prev.onBackClick === m.onBackClick
      ) {
        return prev;
      }
      return m;
    });
  }, []);

  const contextValue = useMemo<LayoutContextValue>(
    () => ({ meta, setMeta, isInsideShell: true }),
    [meta, setMeta]
  );

  return (
    <LayoutContext.Provider value={contextValue}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayoutMeta() {
  return useContext(LayoutContext);
}
