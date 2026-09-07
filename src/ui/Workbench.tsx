"use client";
import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { DataRecord, Entity, Role } from "../core/types";
import { can } from "../core/permissions";
import { translator, type Locale } from "./i18n";
import { RecordForm, type References } from "./RecordForm";
import { ImportDialog } from "./ImportDialog";
import { ErrorNotice, Status } from "./components";
import { api } from "./api";

export function Workbench({
  entity,
  items,
  references,
  role,
  locale,
}: {
  entity: Entity;
  items: DataRecord[];
  references: References;
  role: Role;
  locale: Locale;
}) {
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState(""),
    [editing, setEditing] = useState<DataRecord | null | undefined>(undefined),
    [importing, setImporting] = useState(false),
    [error, setError] = useState<unknown>(null);
  const t = translator(locale),
    router = useRouter();
  const writable = can(role, entity === "rules" ? "rules" : "write");
  const visible = useMemo(
    () =>
      items.filter(
        (item) =>
          JSON.stringify(item).toLocaleLowerCase().includes(query.toLocaleLowerCase()) &&
          (!filter || Object.values(item).includes(filter)),
      ),
    [items, query, filter],
  );
  const statusOptions = Array.from(
    new Set(
      items.flatMap((item) => {
        const value = item as unknown as Record<string, unknown>;
        return [
          value.status ?? value.availability ?? value.stage ?? value.verificationStatus,
        ]
          .filter(Boolean)
          .map(String);
      }),
    ),
  ).sort();
  const label = (target: Entity, id: unknown) =>
    references[target]?.find((record) => record.id === id)?.label ?? "—";
  async function archive(item: DataRecord) {
    if (!window.confirm(t("archiveConfirm"))) return;
    setError(null);
    try {
      await api(`/api/records/${entity}/${item.id}`, { version: item.version }, "DELETE");
      router.refresh();
    } catch (error) {
      setError(error);
    }
  }
  return (
    <>
      <header className="page-heading">
        <div>
          <div className="eyebrow">OPENFOOTBALL / {t("workspaceTag")}</div>
          <h1>
            {t(entity)} <span className="count-badge">{items.length}</span>
          </h1>
        </div>
        <div className="toolbar-actions">
          {can(role, "export") && (
            <details className="export-menu">
              <summary className="button secondary">{t("export")}</summary>
              <div className="export-options">
                <a href={`/api/export/${entity}?format=csv`}>CSV</a>
                <a href={`/api/export/${entity}?format=json`}>JSON</a>
              </div>
            </details>
          )}
          {writable && (
            <>
              <button className="button secondary" onClick={() => setImporting(true)}>
                {t("import")}
              </button>
              <button className="button primary" onClick={() => setEditing(null)}>
                ＋ {t("newRecord")}
              </button>
            </>
          )}
        </div>
      </header>
      {entity === "mandates" && <p className="notice">{t("mandateNotice")}</p>}
      {entity === "rules" && <p className="notice">{t("rulesNotice")}</p>}
      <ErrorNotice error={error} locale={locale} />
      <div className="list-tools">
        <label className="search-field">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            aria-label={t("search")}
            placeholder={t("search")}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
        {statusOptions.length > 0 && (
          <select
            aria-label={t("status")}
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          >
            <option value="">{t("all")}</option>
            {statusOptions.map((status) => (
              <option value={status} key={status}>
                {t(status)}
              </option>
            ))}
          </select>
        )}
        <span className="result-count" role="status">
          {visible.length} {t("records")}
        </span>
      </div>
      {visible.length === 0 ? (
        <div className="empty-state">
          <span className="empty-mark" aria-hidden="true">
            ＋
          </span>
          <h2>{t(items.length ? "noResults" : "noRecords")}</h2>
          <p>{t("startRecords")}</p>
          {writable && (
            <button className="button primary" onClick={() => setEditing(null)}>
              {t("newRecord")}
            </button>
          )}
        </div>
      ) : (
        <div
          className={`record-grid ${entity === "clubs" || entity === "opportunities" ? "cards" : ""}`}
        >
          {visible.map((item, index) => {
            const r = item as unknown as Record<string, unknown>;
            const name = String(r.name ?? r.title ?? label("players", r.playerId));
            const state = String(
              r.status ?? r.availability ?? r.stage ?? r.verificationStatus ?? "",
            );
            const tags = (r.positions ?? r.licences ?? []) as string[];
            return (
              <article key={item.id} className="record-card">
                <div className="record-identity">
                  <span className="record-avatar" aria-hidden="true">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div>
                    <button className="record-title" onClick={() => setEditing(item)}>
                      {name}
                    </button>
                    <p className="record-subtitle">
                      {entity === "players"
                        ? r.clubId
                          ? label("clubs", r.clubId)
                          : t("unknown")
                        : entity === "pipeline"
                          ? label("opportunities", r.opportunityId)
                          : entity === "mandates"
                            ? `${r.startDate} — ${r.endDate}`
                            : String(
                                r.league ??
                                  r.jurisdiction ??
                                  (r.languages as string[] | undefined)?.join(" · ") ??
                                  "",
                              )}
                    </p>
                  </div>
                </div>
                <div className="record-meta">
                  {state && <Status value={state} locale={locale} />}
                  <div className="tags">
                    {tags.slice(0, 3).map((tag) => (
                      <span key={tag}>{t(tag)}</span>
                    ))}
                    {Array.isArray(r.nationalities) &&
                      r.nationalities.map((code: string) => (
                        <span key={code}>{code}</span>
                      ))}
                  </div>
                  {typeof r.monthlySalary === "number" && (
                    <span className="money">
                      {new Intl.NumberFormat(locale).format(r.monthlySalary)}{" "}
                      {String(r.currency)} <small>{t("perMonth")}</small>
                    </span>
                  )}
                  {!!r.deadline && (
                    <span className="small-text">
                      {t("deadline")}: {String(r.deadline)}
                    </span>
                  )}
                </div>
                <div className="record-actions">
                  {entity === "opportunities" && (
                    <Link
                      className="button compact secondary"
                      href={`/matches?opportunityId=${item.id}`}
                    >
                      {t("runMatching")}
                    </Link>
                  )}
                  <button className="text-button" onClick={() => setEditing(item)}>
                    {t(writable ? "edit" : "view")}
                  </button>
                  {writable && (
                    <button className="text-button muted" onClick={() => archive(item)}>
                      {t("archive")}
                    </button>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
      {editing !== undefined && (
        <RecordForm
          entity={entity}
          record={editing}
          references={references}
          locale={locale}
          readOnly={!writable}
          onClose={() => setEditing(undefined)}
        />
      )}
      {importing && (
        <ImportDialog
          entity={entity}
          locale={locale}
          onClose={() => setImporting(false)}
        />
      )}
    </>
  );
}
