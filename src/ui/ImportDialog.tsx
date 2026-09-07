"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Entity } from "../core/types";
import { translator, type Locale } from "./i18n";
import { api } from "./api";
import { ErrorNotice, Modal } from "./components";
import { fields } from "./fields";

export function ImportDialog({
  entity,
  locale,
  onClose,
}: {
  entity: Entity;
  locale: Locale;
  onClose: () => void;
}) {
  const [content, setContent] = useState(""),
    [format, setFormat] = useState<"csv" | "json">("csv"),
    [count, setCount] = useState(0),
    [preview, setPreview] = useState<Record<string, unknown>[]>([]),
    [error, setError] = useState<unknown>(null),
    [pending, setPending] = useState(false);
  const t = translator(locale),
    router = useRouter();
  async function run(dryRun: boolean) {
    setPending(true);
    setError(null);
    try {
      const result = await api(`/api/import/${entity}`, {
        content,
        format,
        dryRun,
      });
      if (dryRun) {
        setCount(result.count);
        setPreview(result.preview);
      } else {
        router.refresh();
        onClose();
      }
    } catch (error) {
      setError(error);
      setCount(0);
    } finally {
      setPending(false);
    }
  }
  function template() {
    const headers = fields[entity].map((f) => f.key).join(",") + "\r\n";
    const a = document.createElement("a");
    const url = URL.createObjectURL(new Blob([headers], { type: "text/csv" }));
    a.href = url;
    a.download = `${entity}-template.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <Modal title={`${t("importTitle")} · ${t(entity)}`} locale={locale} onClose={onClose}>
      <div className="modal-body">
        <p>{t("importHelp")}</p>
        <ErrorNotice error={error} locale={locale} />
        <label className="field">
          {t("file")}
          <input
            type="file"
            accept=".csv,.json,text/csv,application/json"
            disabled={pending}
            onChange={async (event) => {
              setCount(0);
              setError(null);
              setContent("");
              const file = event.target.files?.[0];
              if (!file) return;
              if (file.size > 1048576) {
                setError(new Error("tooLarge"));
                return;
              }
              setFormat(file.name.toLowerCase().endsWith(".json") ? "json" : "csv");
              setContent(await file.text());
            }}
          />
        </label>
        <button className="text-button" type="button" onClick={template}>
          {t("template")}
        </button>
        {count > 0 && (
          <div className="import-preview">
            <strong>
              {count} {t("importReady")}
            </strong>
            <ul>
              {preview.map((row, i) => (
                <li key={i}>
                  {String(
                    row.name ?? row.title ?? row.playerId ?? row.jurisdiction ?? i + 1,
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="modal-footer">
        <button className="button secondary" onClick={onClose}>
          {t("cancel")}
        </button>
        <button
          className="button primary"
          disabled={!content || pending}
          onClick={() => run(count === 0)}
        >
          {t(pending ? "working" : count ? "confirmImport" : "preview")}
        </button>
      </div>
    </Modal>
  );
}
