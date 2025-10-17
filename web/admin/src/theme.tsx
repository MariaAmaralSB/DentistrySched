import { createContext, useContext, useEffect, useMemo, useState } from "react";

type ThemeCtx = { dark: boolean; toggle: () => void; set: (v: boolean) => void };
const Ctx = createContext<ThemeCtx>({ dark: false, toggle: () => {}, set: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState<boolean>(() => {
    const saved = localStorage.getItem("theme.dark");
    if (saved === "true" || saved === "false") return saved === "true";
    return window.matchMedia?.("(prefers-color-scheme: dark)").matches ?? false;
  });

  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle("dark", dark);
    localStorage.setItem("theme.dark", String(dark));
  }, [dark]);

  const value = useMemo(
    () => ({ dark, toggle: () => setDark(v => !v), set: setDark }),
    [dark]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export const useTheme = () => useContext(Ctx);
