import Link from "next/link";
import { cookies } from "next/headers";
import { localeFrom, translator } from "@/ui/i18n";
export default async function NotFound() {
  const t = translator(localeFrom((await cookies()).get("ofat_locale")?.value));
  return (
    <main className="error-page">
      <h1>{t("pageNotFound")}</h1>
      <Link href="/" className="button primary">
        {t("dashboard")}
      </Link>
    </main>
  );
}
