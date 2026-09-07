"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Mandate, Player, Role } from "../core/types";
import { daysUntil } from "../core/dates";
import { translator, type Locale } from "./i18n";
import { api } from "./api";
import { ErrorNotice, Status } from "./components";

export function Dashboard({
  counts,
  expiring,
  players,
  locale,
  role,
  asOf,
  empty,
}: {
  counts: { players: number; coaches: number; opportunities: number };
  expiring: Mandate[];
  players: Player[];
  locale: Locale;
  role: Role;
  asOf: string;
  empty: boolean;
}) {
  const t = translator(locale),
    router = useRouter(),
    [pending, setPending] = useState(false),
    [error, setError] = useState<unknown>(null);
  return (
    <>
      <header className="page-heading">
        <div>
          <span className="eyebrow">{t("workspaceTag")}</span>
          <h1>{t("deskTitle")}</h1>
          <p>{t("deskIntro")}</p>
        </div>
        <Link className="button primary" href="/matches">
          {t("runMatching")}
        </Link>
      </header>
      <div className="stat-grid">
        {[
          ["players", counts.players, "/players"],
          ["coaches", counts.coaches, "/coaches"],
          ["activeOpportunities", counts.opportunities, "/opportunities"],
          ["expiring", expiring.length, "/mandates"],
        ].map(([key, value, href]) => (
          <Link className="stat-card" href={String(href)} key={key}>
            <span>{t(String(key))}</span>
            <strong>{value}</strong>
            <small>{t("viewAll")} ↗</small>
          </Link>
        ))}
      </div>
      <ErrorNotice error={error} locale={locale} />
      {empty && role === "OWNER" && (
        <div className="demo-panel">
          <div>
            <span className="eyebrow">{t("demo")}</span>
            <h2>{t("noRecords")}</h2>
            <p>{t("demoHelp")}</p>
          </div>
          <button
            className="button secondary"
            disabled={pending}
            onClick={async () => {
              setPending(true);
              try {
                await api("/api/demo", {});
                router.refresh();
              } catch (error) {
                setError(error);
              } finally {
                setPending(false);
              }
            }}
          >
            {t(pending ? "working" : "loadDemo")}
          </button>
        </div>
      )}
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>{t("nextActions")}</h2>
            <Link href="/mandates">{t("viewAll")}</Link>
          </div>
          {expiring.length ? (
            <div className="action-list">
              {expiring.map((m) => (
                <div key={m.id}>
                  <div>
                    <strong>
                      {players.find((p) => p.id === m.playerId)?.name ?? t("playerId")}
                    </strong>
                    <p>{m.endDate}</p>
                  </div>
                  <span className="deadline-pill">
                    {daysUntil(m.endDate, asOf)} {t("days")}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="panel-empty">{t("noResults")}</div>
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>{t("players")}</h2>
            <Link href="/players">{t("viewAll")}</Link>
          </div>
          {players.slice(0, 4).map((player) => (
            <div className="mini-profile" key={player.id}>
              <span className="avatar-small">{player.name.slice(0, 1)}</span>
              <div>
                <strong>{player.name}</strong>
                <small>{player.positions.map(t).join(" · ") || t("unknown")}</small>
              </div>
              <Status value={player.availability} locale={locale} />
            </div>
          ))}
          {!players.length && <div className="panel-empty">{t("noRecords")}</div>}
        </section>
      </div>
      <div className="workspace-note">{t("privacy")}</div>
    </>
  );
}
