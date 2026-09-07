"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { ApiError } from "./api";
import { translator, type Locale } from "./i18n";

export function LocalePicker({ locale }: { locale: Locale }) {
  const router = useRouter();
  const t = translator(locale);
  return (
    <select
      className="locale-picker"
      aria-label={t("language")}
      value={locale}
      onChange={(e) => {
        document.cookie = `ofat_locale=${e.target.value}; Path=/; SameSite=Strict; Max-Age=31536000`;
        router.refresh();
      }}
    >
      <option value="en">English</option>
      <option value="fr">Français</option>
      <option value="ar">العربية</option>
    </select>
  );
}
export function Modal({
  title,
  onClose,
  children,
  locale,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  locale: Locale;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);
  return (
    <dialog ref={ref} className="modal" aria-labelledby="modal-title" onCancel={onClose}>
      <div className="modal-header">
        <h2 id="modal-title">{title}</h2>
        <button
          type="button"
          className="icon-button"
          onClick={onClose}
          aria-label={translator(locale)("close")}
        >
          ×
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function ErrorNotice({ error, locale }: { error: unknown; locale: Locale }) {
  if (!error) return null;
  const t = translator(locale);
  const code =
    error instanceof ApiError
      ? error.code
      : error instanceof Error
        ? error.message
        : "serverError";
  return (
    <div className="notice danger" role="alert">
      <strong>{t(code)}</strong>
      {error instanceof ApiError && error.issues.length > 0 && (
        <ul>
          {error.issues.map((issue, i) => (
            <li key={i}>
              {t(issue.path.split(".")[0])}: {issue.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
export function Status({ value, locale }: { value: string; locale: Locale }) {
  const tone = ["MATCH", "PASS", "SIGNED", "ACTIVE", "VERIFIED"].includes(value)
    ? "good"
    : ["NO_MATCH", "FAIL", "REJECTED", "REVOKED", "CLOSED"].includes(value)
      ? "bad"
      : ["INCOMPLETE", "UNKNOWN", "UNVERIFIED", "DRAFT", "HISTORICAL"].includes(value)
        ? "warning"
        : "neutral";
  return <span className={`status ${tone}`}>{translator(locale)(value)}</span>;
}
