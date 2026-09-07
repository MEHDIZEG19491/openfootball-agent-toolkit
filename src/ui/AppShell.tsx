"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import type { User } from "../core/types";
import { translator, type Locale } from "./i18n";
import { LocalePicker } from "./components";
import { api } from "./api";

const navigation = [
  ["dashboard", "/"],
  ["players", "/players"],
  ["coaches", "/coaches"],
  ["clubs", "/clubs"],
  ["opportunities", "/opportunities"],
  ["matches", "/matches"],
  ["pipeline", "/pipeline"],
  ["mandates", "/mandates"],
  ["rules", "/rules"],
];
export function AppShell({
  user,
  locale,
  children,
}: {
  user: User;
  locale: Locale;
  children: ReactNode;
}) {
  const t = translator(locale),
    path = usePathname(),
    router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false),
    [error, setError] = useState(false);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        {t("skip")}
      </a>
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark">OF</span>
          <span>
            OpenFootball<small>AGENT TOOLKIT</small>
          </span>
        </Link>
        <div className="sidebar-label">{t("workspaceTag")}</div>
        <nav aria-label={t("dashboard")}>
          {navigation.map(([key, href], i) => (
            <Link
              key={key}
              href={href}
              className={path === href ? "active" : ""}
              aria-current={path === href ? "page" : undefined}
            >
              <span className="nav-number" aria-hidden="true">
                {String(i + 1).padStart(2, "0")}
              </span>
              {t(key)}
            </Link>
          ))}
        </nav>
        <div className="sidebar-footer">
          <Link href="/settings">{t("settings")}</Link>
          <Link href="/help">{t("help")}</Link>
          <span className="version">v0.1.0 · Apache-2.0</span>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span className="workspace-label">{t("privateWorkspace")}</span>
          <div className="topbar-right">
            <LocalePicker locale={locale} />
            <span className="user-name">
              {user.name}
              <small>{t(user.role)}</small>
            </span>
            <button
              className="text-button"
              disabled={loggingOut}
              onClick={async () => {
                setLoggingOut(true);
                try {
                  await api("/api/auth/logout", {});
                  router.replace("/login");
                  router.refresh();
                } catch {
                  setError(true);
                  setLoggingOut(false);
                }
              }}
            >
              {t("logout")}
            </button>
          </div>
        </header>
        {error && (
          <div className="notice danger" role="alert">
            {t("serverError")}
          </div>
        )}
        <main id="main-content" className="main-content">
          {children}
        </main>
      </div>
    </div>
  );
}
