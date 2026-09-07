"use client";
import { createContext, useContext, type ReactNode } from "react";
import type { Locale } from "./i18n";
const LocaleContext = createContext<Locale>("en");
export const useLocale = () => useContext(LocaleContext);
export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  return <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>;
}
