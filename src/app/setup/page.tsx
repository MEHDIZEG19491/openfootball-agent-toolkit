import { cookies } from "next/headers";
import { localeFrom } from "@/ui/i18n";
import { AuthForm } from "@/ui/AuthForm";
export const metadata = { title: "Initial setup" };
export default async function SetupPage() {
  return (
    <AuthForm setup locale={localeFrom((await cookies()).get("ofat_locale")?.value)} />
  );
}
