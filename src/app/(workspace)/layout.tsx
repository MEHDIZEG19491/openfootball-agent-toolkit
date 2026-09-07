import { pageContext } from "@/server/page-context";
import { AppShell } from "@/ui/AppShell";
export const dynamic = "force-dynamic";
export default async function WorkspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, locale } = await pageContext();
  return (
    <AppShell user={user} locale={locale}>
      {children}
    </AppShell>
  );
}
