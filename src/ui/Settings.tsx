"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { User } from "../core/types";
import { translator, type Locale } from "./i18n";
import { api } from "./api";
import { ErrorNotice, Status } from "./components";

export function Settings({
  user,
  users,
  locale,
}: {
  user: User;
  users: User[];
  locale: Locale;
}) {
  const t = translator(locale),
    router = useRouter(),
    [error, setError] = useState<unknown>(null),
    [pending, setPending] = useState(false),
    [saved, setSaved] = useState(false);
  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setPending(true);
    setError(null);
    setSaved(false);
    try {
      await api("/api/users", Object.fromEntries(new FormData(form)));
      form.reset();
      router.refresh();
      setSaved(true);
    } catch (error) {
      setError(error);
    } finally {
      setPending(false);
    }
  }
  async function password(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      await api(
        "/api/auth/password",
        Object.fromEntries(new FormData(event.currentTarget)),
      );
      router.replace("/login");
      router.refresh();
    } catch (error) {
      setError(error);
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <header className="page-heading">
        <div>
          <span className="eyebrow">OPENFOOTBALL</span>
          <h1>{t("settings")}</h1>
        </div>
      </header>
      <ErrorNotice error={error} locale={locale} />
      {saved && (
        <p className="notice success" role="status">
          {t("saved")}
        </p>
      )}
      {user.role === "OWNER" && (
        <section className="panel settings-panel">
          <h2>{t("team")}</h2>
          <p>{t("roleHelp")}</p>
          <div className="team-list">
            {users.map((member) => (
              <div className="team-member" key={member.id}>
                <div>
                  <strong>{member.name}</strong>
                  <small>{member.email}</small>
                </div>
                <Status value={member.role} locale={locale} />
                <select
                  aria-label={`${t("role")} — ${member.name}`}
                  defaultValue={member.role}
                  disabled={pending || member.id === user.id}
                  onChange={async (e) => {
                    setError(null);
                    setPending(true);
                    try {
                      await api(
                        `/api/users/${member.id}`,
                        { role: e.target.value },
                        "PATCH",
                      );
                      router.refresh();
                    } catch (error) {
                      e.target.value = member.role;
                      setError(error);
                    } finally {
                      setPending(false);
                    }
                  }}
                >
                  {["OWNER", "EDITOR", "VIEWER"].map((role) => (
                    <option value={role} key={role}>
                      {t(role)}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
          <h3>{t("addUser")}</h3>
          <form className="form-grid" onSubmit={add}>
            <label className="field">
              {t("name")}
              <input name="name" minLength={2} maxLength={160} required />
            </label>
            <label className="field">
              {t("email")}
              <input name="email" type="email" autoComplete="off" required />
            </label>
            <label className="field">
              {t("password")}
              <input
                name="password"
                type="password"
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                required
              />
              <small>{t("passwordHint")}</small>
            </label>
            <label className="field">
              {t("role")}
              <select name="role" defaultValue="VIEWER">
                {["VIEWER", "EDITOR", "OWNER"].map((role) => (
                  <option key={role} value={role}>
                    {t(role)}
                  </option>
                ))}
              </select>
            </label>
            <div>
              <button className="button primary" disabled={pending}>
                {t("addUser")}
              </button>
            </div>
          </form>
        </section>
      )}
      <section className="panel settings-panel">
        <h2>{t("passwordChange")}</h2>
        <p>{t("passwordChangeHelp")}</p>
        <form className="form-grid" onSubmit={password}>
          <label className="field">
            {t("currentPassword")}
            <input
              name="current"
              type="password"
              maxLength={128}
              autoComplete="current-password"
              required
            />
          </label>
          <label className="field">
            {t("newPassword")}
            <input
              name="replacement"
              type="password"
              minLength={12}
              maxLength={128}
              autoComplete="new-password"
              required
            />
            <small>{t("passwordHint")}</small>
          </label>
          <div>
            <button className="button primary" disabled={pending}>
              {t("passwordChange")}
            </button>
          </div>
        </form>
      </section>
    </>
  );
}
