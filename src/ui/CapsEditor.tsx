"use client";
import { useState } from "react";
import type { Cap } from "../core/types";
import { translator, type Locale } from "./i18n";

export function CapsEditor({ initial, locale }: { initial: Cap[]; locale: Locale }) {
  const [rows, setRows] = useState(
    initial.map((cap) => ({ ...cap, key: crypto.randomUUID() })),
  );
  const t = translator(locale);
  const change = (index: number, patch: Partial<Cap>) =>
    setRows(rows.map((cap, i) => (i === index ? { ...cap, ...patch } : cap)));
  return (
    <div className="caps-editor">
      <p className="field-help">{t("capsHelp")}</p>
      <input
        type="hidden"
        name="caps"
        value={JSON.stringify(
          rows.map((cap) => ({
            date: cap.date,
            count: cap.count,
            level: cap.level,
            official: cap.official,
            source: cap.source,
          })),
        )}
      />
      {rows.map((cap, index) => (
        <div className="cap-row" key={cap.key}>
          <label>
            {t("date")}
            <input
              type="date"
              required
              value={cap.date}
              onChange={(e) => change(index, { date: e.target.value })}
            />
          </label>
          <label>
            {t("count")}
            <input
              type="number"
              required
              min="1"
              max="100"
              value={cap.count}
              onChange={(e) => change(index, { count: Number(e.target.value) })}
            />
          </label>
          <label>
            {t("level")}
            <select
              value={cap.level}
              onChange={(e) => change(index, { level: e.target.value as Cap["level"] })}
            >
              {["SENIOR", "A_PRIME", "OLYMPIC", "U23", "U20", "U17"].map((level) => (
                <option key={level} value={level}>
                  {t(level)}
                </option>
              ))}
            </select>
          </label>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={cap.official}
              onChange={(e) => change(index, { official: e.target.checked })}
            />
            {t("official")}
          </label>
          <label className="cap-source">
            {t("source")}
            <input
              type="url"
              value={cap.source}
              placeholder="https://…"
              onChange={(e) => change(index, { source: e.target.value })}
            />
          </label>
          <button
            type="button"
            className="text-button danger-text"
            onClick={() => setRows(rows.filter((_, i) => i !== index))}
          >
            {t("remove")}
          </button>
        </div>
      ))}
      <button
        type="button"
        className="button secondary"
        onClick={() =>
          setRows([
            ...rows,
            {
              key: crypto.randomUUID(),
              date: "",
              count: 1,
              level: "SENIOR",
              official: true,
              source: "",
            },
          ])
        }
      >
        {t("addAppearance")}
      </button>
    </div>
  );
}
