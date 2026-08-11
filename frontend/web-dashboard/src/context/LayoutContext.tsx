import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface LayoutMeta {
  active: string;
  title: string;
  breadcrumb?: string;
  pageTitle?: ReactNode;
  pageSub?: string;
  actions?: ReactNode;
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
    setMetaState(m);
  }, []);

  return (
    <LayoutContext.Provider value={{ meta, setMeta, isInsideShell: true }}>
      {children}
    </LayoutContext.Provider>
  );
}

export function useLayoutMeta() {
  return useContext(LayoutContext);
}
