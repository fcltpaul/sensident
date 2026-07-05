'use client';

import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';

interface InviteModalCtx {
  isOpen: boolean;
  open: () => void;
  close: () => void;
}

const Ctx = createContext<InviteModalCtx | null>(null);

export function InviteModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const value = useMemo<InviteModalCtx>(
    () => ({
      isOpen,
      open: () => setIsOpen(true),
      close: () => setIsOpen(false),
    }),
    [isOpen]
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useInviteModal(): InviteModalCtx {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error('useInviteModal doit être utilisé dans <InviteModalProvider>');
  }
  return ctx;
}
