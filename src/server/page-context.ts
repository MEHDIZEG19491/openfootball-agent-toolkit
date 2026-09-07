import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { sessionUser } from "./auth";
import { sessionCookieName } from "./security";
import { localeFrom, type Locale } from "../ui/i18n";

export async function pageContext() {
  const jar = await cookies();
  const user = sessionUser(jar.get(sessionCookieName)?.value);
  if (!user) redirect("/login");
  const locale: Locale = localeFrom(jar.get("ofat_locale")?.value);
  return { user, locale };
}
