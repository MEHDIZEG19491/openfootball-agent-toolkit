import type { Metadata } from "next";
import { cookies } from "next/headers";
import { localeFrom } from "@/ui/i18n";
import { LocaleProvider } from "@/ui/LocaleContext";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "OpenFootball Agent Toolkit",
    template: "%s · OpenFootball",
  },
  description: "Private football representation and recruitment workspace.",
  robots: { index: false, follow: false },
};
export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const locale = localeFrom((await cookies()).get("ofat_locale")?.value);
  return (
    <html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>
      <body>
        <LocaleProvider locale={locale}>{children}</LocaleProvider>
      </body>
    </html>
  );
}
