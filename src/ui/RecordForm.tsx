"use client";
import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Cap, DataRecord, Entity } from "../core/types";
import { fields, formRecord } from "./fields";
import { translator, type Locale } from "./i18n";
import { api } from "./api";
import { CapsEditor } from "./CapsEditor";
import { ErrorNotice, Modal } from "./components";

export type References = Partial<Record<Entity, { id: string; label: string }[]>>;
export function RecordForm({
  entity,
  record,
  references,
  locale,
  readOnly,
  onClose,
}: {
  entity: Entity;
  record: DataRecord | null;
  references: References;
  locale: Locale;
  readOnly: boolean;
  onClose: () => void;
}) {
  const [error, setError] = useState<unknown>(null),
    [pending, setPending] = useState(false);
  const t = translator(locale),
    router = useRouter();
  const initial = record as unknown as Record<string, unknown> | null;
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      const data = formRecord(entity, new FormData(event.currentTarget));
      await api(
        `/api/records/${entity}${record ? `/${record.id}` : ""}`,
        record ? { data, version: record.version } : data,
        record ? "PATCH" : "POST",
      );
      router.refresh();
      onClose();
    } catch (error) {
      setError(error);
    } finally {
      setPending(false);
    }
  }
  return (
    <Modal
      title={`${t(record ? (readOnly ? "details" : "edit") : "newRecord")} · ${t(entity)}`}
      locale={locale}
      onClose={onClose}
    >
      <form onSubmit={submit}>
        <div className="modal-body">
          <ErrorNotice error={error} locale={locale} />
          {record && (
            <div className="resource-links">
              {["videoUrl", "documentUrl", "website", "source"].map((key) =>
                typeof initial?.[key] === "string" && initial[key] ? (
                  <a
                    className="button secondary"
                    key={key}
                    href={String(initial[key])}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {t(key)} ↗
                  </a>
                ) : null,
              )}
            </div>
          )}
          <fieldset disabled={readOnly || pending} className="form-grid">
            {fields[entity].map((field) => {
              const value = initial?.[field.key] ?? field.initial;
              const inputId = `field-${field.key}`;
              const helpId = `help-${field.key}`;
              const base = {
                id: inputId,
                name: field.key,
                required: field.required,
              };
              if (field.kind === "checkbox")
                return (
                  <label key={field.key} className="checkbox-label full-width">
                    <input {...base} type="checkbox" defaultChecked={Boolean(value)} />
                    {t(field.key)}
                  </label>
                );
              if (field.kind === "caps")
                return (
                  <fieldset className="full-width section-fieldset" key={field.key}>
                    <legend>{t(field.key)}</legend>
                    <CapsEditor initial={(value as Cap[]) ?? []} locale={locale} />
                  </fieldset>
                );
              if (field.kind === "multi")
                return (
                  <fieldset className="full-width section-fieldset" key={field.key}>
                    <legend>{t(field.key)}</legend>
                    <div className="choice-grid">
                      {field.options?.map((option) => (
                        <label key={option} className="choice">
                          <input
                            type="checkbox"
                            name={field.key}
                            value={option}
                            defaultChecked={
                              Array.isArray(value) && value.includes(option)
                            }
                          />
                          <span>{t(option)}</span>
                        </label>
                      ))}
                    </div>
                  </fieldset>
                );
              let control;
              if (field.kind === "select")
                control = (
                  <select
                    {...base}
                    defaultValue={String(value ?? field.options?.[0] ?? "")}
                  >
                    {field.options?.map((option) => (
                      <option value={option} key={option}>
                        {t(option)}
                      </option>
                    ))}
                  </select>
                );
              else if (field.kind === "reference")
                control = (
                  <select {...base} defaultValue={String(value ?? "")}>
                    <option value="">—</option>
                    {references[field.target!]?.map((option) => (
                      <option value={option.id} key={option.id}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                );
              else if (field.kind === "textarea" || field.kind === "json")
                control = (
                  <textarea
                    {...base}
                    rows={field.kind === "json" ? 7 : 3}
                    maxLength={field.kind === "json" ? 20000 : 6000}
                    dir={field.kind === "json" ? "ltr" : undefined}
                    defaultValue={
                      field.kind === "json"
                        ? JSON.stringify(value ?? [], null, 2)
                        : String(value ?? "")
                    }
                  />
                );
              else
                control = (
                  <input
                    {...base}
                    type={
                      ["number", "date", "url"].includes(field.kind ?? "")
                        ? field.kind
                        : "text"
                    }
                    min={field.kind === "number" ? 0 : undefined}
                    step={field.kind === "number" ? 1 : undefined}
                    maxLength={
                      field.kind === "url" ? 2000 : field.kind === "tags" ? 500 : 160
                    }
                    aria-describedby={field.kind === "tags" ? helpId : undefined}
                    defaultValue={
                      Array.isArray(value) ? value.join("; ") : String(value ?? "")
                    }
                  />
                );
              return (
                <div
                  className={`field ${["textarea", "json"].includes(field.kind ?? "") ? "full-width" : ""}`}
                  key={field.key}
                >
                  <label htmlFor={inputId}>
                    {t(field.key)}
                    {field.required && (
                      <span className="required" aria-label={t("required")}>
                        {" "}
                        *
                      </span>
                    )}
                  </label>
                  {control}
                  {field.kind === "tags" && <small id={helpId}>{t("tagsHelp")}</small>}
                </div>
              );
            })}
          </fieldset>
        </div>
        <div className="modal-footer">
          <button className="button secondary" type="button" onClick={onClose}>
            {t(readOnly ? "close" : "cancel")}
          </button>
          {!readOnly && (
            <button className="button primary" disabled={pending}>
              {t(pending ? "working" : record ? "save" : "create")}
            </button>
          )}
        </div>
      </form>
    </Modal>
  );
}
