import { pageContext } from "@/server/page-context";
import { getRepository } from "@/server/database";
import { todayUTC, daysUntil } from "@/core/dates";
import { Dashboard } from "@/ui/Dashboard";
export default async function DashboardPage() {
  const { user, locale } = await pageContext();
  const repo = getRepository(),
    players = repo.list("players"),
    asOf = todayUTC();
  const expiring = repo
    .list("mandates")
    .filter(
      (m) =>
        m.status === "ACTIVE" &&
        daysUntil(m.endDate, asOf) >= 0 &&
        daysUntil(m.endDate, asOf) <= 30,
    );
  return (
    <Dashboard
      locale={locale}
      role={user.role}
      asOf={asOf}
      players={players}
      expiring={expiring}
      empty={repo.count() === 0}
      counts={{
        players: players.length,
        coaches: repo.list("coaches").length,
        opportunities: repo
          .list("opportunities")
          .filter((o) => o.status === "OPEN" && (!o.deadline || o.deadline >= asOf))
          .length,
      }}
    />
  );
}
