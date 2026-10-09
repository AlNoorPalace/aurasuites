import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

export type Search = { hotel: string; checkIn: string; checkOut: string; adults: number; children: number; rooms: number };
type Ctx = Search & { set: (p: Partial<Search>) => void };

const DEFAULT: Search = { hotel: '', checkIn: '', checkOut: '', adults: 2, children: 0, rooms: 1 };
const KEY = 'aura-search';
const SearchCtx = createContext<Ctx>({ ...DEFAULT, set: () => {} });

export function SearchProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<Search>(DEFAULT);
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) setS({ ...DEFAULT, ...JSON.parse(raw) });
    } catch {}
  }, []);
  const value = useMemo<Ctx>(() => ({
    ...s,
    set: (p) => setS((prev) => {
      const next = { ...prev, ...p };
      try { sessionStorage.setItem(KEY, JSON.stringify(next)); } catch {}
      return next;
    }),
  }), [s]);
  return <SearchCtx.Provider value={value}>{children}</SearchCtx.Provider>;
}
export const useSearch = () => useContext(SearchCtx);
