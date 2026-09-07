"use client";
import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MatchResult, Opportunity, Player, Role } from "../core/types";
import { can } from "../core/permissions";
import { translator, type Locale } from "./i18n";
import { api } from "./api";
import { ErrorNotice, Status } from "./components";

export function MatchBoard({
  opportunities,
  selected,
  results,
  shortlisted,
  locale,
  role,
  asOf,
}: {
  opportunities: Opportunity[];
  selected: string;
  results: { player: Player; result: MatchResult }[];
  shortlisted: string[];
  locale: Locale;
  role: Role;
  asOf: string;
}) {
  const t = translator(locale),
    router = useRouter(),
    [error, setError] = useState<unknown>(null),
    [pending, setPending] = useState("");
  return (
    <>
      <header className="page-heading">
        <div>
          <span className="eyebrow">{t("matches")}</span>
          <h1>{t("matchingTitle")}</h1>
          <p>{t("matchingIntro")}</p>
        </div>
      </header>
      <form className="match-controls" action="/matches" method="get">
        <label>
          {t("selectOpportunity")}
          <select name="opportunityId" defaultValue={selected} required>
            <option value="">—</option>
            {opportunities.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t("asOf")}
          <input type="date" name="asOf" defaultValue={asOf} required />
        </label>
        <button className="button primary">{t("evaluate")}</button>
      </form>
      <ErrorNotice error={error} locale={locale} />
      <p className="field-help match-help">{t("matchingHelp")}</p>
      {!results.length ? (
        <div className="empty-state">
          <h2>{t("noResults")}</h2>
          <Link href="/opportunities" className="button secondary">
            {t("opportunities")}
          </Link>
        </div>
      ) : (
        <div className="match-list">
          {results.map(({ player, result }) => (
            <article className="match-card" key={player.id}>
              <div className="match-summary">
                <div className="match-score">
                  <strong>
                    {result.score}
                    <small>%</small>
                  </strong>
                  <span>{t("score")}</span>
                </div>
                <div className="match-name">
                  <h2>{player.name}</h2>
                  <p>
                    {player.positions.map(t).join(" · ")} ·{" "}
                    {player.nationalities.join(" / ")}
                  </p>
                  <Status value={result.eligibility} locale={locale} />
                </div>
                {can(role, "write") && (
                  <button
                    className="button secondary"
                    disabled={!!pending || shortlisted.includes(player.id)}
                    onClick={async () => {
                      setError(null);
                      setPending(player.id);
                      try {
                        await api("/api/records/pipeline", {
                          playerId: player.id,
                          opportunityId: selected,
                          stage: "SCOUTED",
                        });
                        router.refresh();
                      } catch (error) {
                        setError(error);
                      } finally {
                        setPending("");
                      }
                    }}
                  >
                    {t(
                      pending === player.id
                        ? "working"
                        : shortlisted.includes(player.id)
                          ? "alreadyShortlisted"
                          : "shortlist",
                    )}
                  </button>
                )}
              </div>
              {result.warnings.map((w) => (
                <p className="notice" key={w}>
                  {t(w)}
                </p>
              ))}
              <details className="criteria" open>
                <summary>{t("details")}</summary>
                <div
                  className="criteria-table"
                  tabIndex={0}
                  role="table"
                  aria-label={`${player.name} — ${t("matches")}`}
                >
                  <div className="criteria-header" role="row">
                    <span role="columnheader">{t("criterion")}</span>
                    <span role="columnheader">{t("expected")}</span>
                    <span role="columnheader">{t("actual")}</span>
                    <span role="columnheader">{t("status")}</span>
                  </div>
                  {result.criteria.map((criterion, index) => (
                    <div className="criterion" role="row" key={index}>
                      <span role="cell">
                        {t(criterion.code)}
                        {criterion.advisory && <small>{t("advisory")}</small>}
                      </span>
                      <span role="cell" dir="auto">
                        {t(criterion.expected)}
                      </span>
                      <span role="cell" dir="auto">
                        {t(criterion.actual)}
                      </span>
                      <span role="cell">
                        <Status value={criterion.status} locale={locale} />
                      </span>
                    </div>
                  ))}
                </div>
              </details>
            </article>
          ))}
        </div>
      )}
    </>
  );
}
