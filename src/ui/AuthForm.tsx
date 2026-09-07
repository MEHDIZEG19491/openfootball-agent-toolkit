"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { translator, type Locale } from "./i18n";
import { ErrorNotice, LocalePicker } from "./components";
import { api } from "./api";
export function AuthForm({ locale, setup = false }: { locale: Locale; setup?: boolean }) {
  const router = useRouter(),
    t = translator(locale),
    [error, setError] = useState<unknown>(null),
    [pending, setPending] = useState(false),
    [done, setDone] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    try {
      await api(`/api/auth/${setup ? "setup" : "login"}`, data);
      if (setup) setDone(true);
      else {
        router.replace("/");
        router.refresh();
      }
    } catch (error) {
      setError(error);
    } finally {
      setPending(false);
    }
  }
  return (
    <main className="auth-page">
      <div className="auth-aside">
        <div className="brand">
          <span className="brand-mark">OF</span>
          <span>
            OpenFootball<small>AGENT TOOLKIT</small>
          </span>
        </div>
        <h2>{t("deskTitle")}</h2>
        <p>{t("privacy")}</p>
        <div className="auth-line" />
        <span>v0.1.0 · OPEN SOURCE</span>
      </div>
      <div className="auth-main">
        <div className="auth-language">
          <LocalePicker locale={locale} />
        </div>
        <div className="auth-card">
          <span className="eyebrow">OPENFOOTBALL</span>
          <h1>{t(setup ? "initialSetup" : "welcome")}</h1>
          <p>{t(setup ? "setupIntro" : "loginIntro")}</p>
          <ErrorNotice error={error} locale={locale} />
          {done ? (
            <div className="notice success" role="status">
              {t("setupDone")} <Link href="/login">{t("login")}</Link>
            </div>
          ) : (
            <form onSubmit={submit}>
              {setup && (
                <label className="field">
                  {t("name")}
                  <input
                    name="name"
                    required
                    minLength={2}
                    maxLength={160}
                    autoComplete="name"
                  />
                </label>
              )}
              <label className="field">
                {t("email")}
                <input
                  name="email"
                  type="email"
                  required
                  maxLength={254}
                  autoComplete="username"
                  dir="ltr"
                />
              </label>
              <label className="field">
                {t("password")}
                <input
                  name="password"
                  type="password"
                  required
                  minLength={setup ? 12 : 1}
                  maxLength={128}
                  autoComplete={setup ? "new-password" : "current-password"}
                />
                {setup && <small>{t("passwordHint")}</small>}
              </label>
              {setup && (
                <label className="field">
                  {t("setupToken")}
                  <input
                    name="token"
                    type="password"
                    required
                    maxLength={256}
                    autoComplete="off"
                    spellCheck={false}
                  />
                </label>
              )}
              <button className="button primary" disabled={pending}>
                {t(pending ? "working" : setup ? "createOwner" : "login")}
              </button>
            </form>
          )}
          <div className="auth-link">
            <Link href={setup ? "/login" : "/setup"}>
              {t(setup ? "login" : "initialSetup")}
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
