import { notFound } from "next/navigation";
import { pageContext } from "@/server/page-context";
import { getRepository, isEntity } from "@/server/database";
import { Workbench } from "@/ui/Workbench";
import { Settings } from "@/ui/Settings";
import { MatchBoard } from "@/ui/MatchBoard";
import { Guide } from "@/ui/Guide";
import { matchPlayer } from "@/core/matching";
import { isDate, todayUTC } from "@/core/dates";
import type { Entity } from "@/core/types";
import type { References } from "@/ui/RecordForm";

export default async function SectionPage({
  params,
  searchParams,
}: {
  params: Promise<{ section: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { user, locale } = await pageContext(),
    { section } = await params,
    query = await searchParams,
    repo = getRepository();
  if (section === "settings")
    return (
      <Settings
        user={user}
        users={user.role === "OWNER" ? repo.users() : []}
        locale={locale}
      />
    );
  if (section === "help") return <Guide locale={locale} />;
  if (section === "matches") {
    const opportunities = repo.list("opportunities");
    const selected =
      typeof query.opportunityId === "string"
        ? query.opportunityId
        : (opportunities[0]?.id ?? "");
    const opportunity = opportunities.find((o) => o.id === selected);
    const asOf =
      typeof query.asOf === "string" && isDate(query.asOf) ? query.asOf : todayUTC();
    const rule = opportunity?.ruleId ? repo.get("rules", opportunity.ruleId) : null;
    const results = opportunity
      ? repo
          .list("players")
          .map((player) => ({
            player,
            result: matchPlayer(player, opportunity, asOf, rule),
          }))
          .sort((a, b) => b.result.score - a.result.score)
      : [];
    return (
      <MatchBoard
        opportunities={opportunities}
        selected={selected}
        results={results}
        shortlisted={repo
          .list("pipeline")
          .filter((p) => p.opportunityId === selected)
          .map((p) => p.playerId)}
        locale={locale}
        role={user.role}
        asOf={asOf}
      />
    );
  }
  if (!isEntity(section)) notFound();
  const references: References = {};
  for (const kind of ["players", "clubs", "opportunities", "rules"] as Entity[])
    references[kind] = repo.list(kind).map((record) => ({
      id: record.id,
      label:
        "name" in record ? record.name : "title" in record ? record.title : record.id,
    }));
  return (
    <Workbench
      entity={section}
      items={repo.list(section)}
      references={references}
      role={user.role}
      locale={locale}
    />
  );
}
