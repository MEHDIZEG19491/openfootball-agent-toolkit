"use client";
import { useLocale } from "@/ui/LocaleContext";
import { translator } from "@/ui/i18n";
export default function ErrorPage({ reset }: { reset: () => void }) {
  const t = translator(useLocale());
  return (
    <main className="error-page">
      <h1>{t("loadError")}</h1>
      <p>{t("retryHelp")}</p>
      <button className="button primary" onClick={reset}>
        {t("retry")}
      </button>
    </main>
  );
}
