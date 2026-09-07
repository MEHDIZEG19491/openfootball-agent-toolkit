import { cookies } from "next/headers";
import { localeFrom } from "@/ui/i18n";
import { AuthForm } from "@/ui/AuthForm";
export const metadata = { title: "Sign in" };
export default async function LoginPage() {
  return <AuthForm locale={localeFrom((await cookies()).get("ofat_locale")?.value)} />;
}
