/** A bounded RFC 4180-style parser. Quoted delimiters/newlines and a UTF-8 BOM are supported. */
export function parseCsv(input: string, maxRows = 500): Record<string, string>[] {
  const text = input.replace(/^\uFEFF/, "");
  if (Buffer.byteLength(text, "utf8") > 1_048_576) throw new Error("CSV exceeds 1 MiB");
  const rows: string[][] = [];
  let row: string[] = [],
    field = "",
    quoted = false,
    closed = false;
  const endField = () => {
    row.push(field);
    field = "";
    closed = false;
  };
  const endRow = () => {
    endField();
    if (row.some((v) => v !== "")) rows.push(row);
    row = [];
    if (rows.length > maxRows + 1) throw new Error(`At most ${maxRows} rows are allowed`);
  };
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') {
        quoted = false;
        closed = true;
      } else field += c;
    } else if (c === '"') {
      if (field || closed) throw new Error("Unexpected quote in CSV");
      quoted = true;
    } else if (c === ",") endField();
    else if (c === "\r" || c === "\n") {
      if (c === "\r" && text[i + 1] === "\n") i++;
      endRow();
    } else {
      if (closed) throw new Error("Characters after a closing quote");
      field += c;
    }
  }
  if (quoted) throw new Error("Unclosed quoted field");
  if (field || row.length || closed) endRow();
  if (!rows.length) throw new Error("CSV is empty");
  const headers = rows.shift()!.map((v) => v.trim());
  if (
    headers.some((v) => !/^[a-zA-Z][a-zA-Z0-9]*$/.test(v)) ||
    new Set(headers).size !== headers.length
  )
    throw new Error("Headers must be unique field names");
  return rows.map((values, index) => {
    if (values.length !== headers.length)
      throw new Error(`Row ${index + 2}: expected ${headers.length} columns`);
    return Object.fromEntries(headers.map((key, i) => [key, values[i]]));
  });
}

/** Neutralize spreadsheet formula cells; exports remain textual, never executable. */
export function csvCell(value: unknown): string {
  let text =
    value == null ? "" : typeof value === "string" ? value : JSON.stringify(value);
  if (/^[\s\uFEFF]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function encodeCsv(rows: Record<string, unknown>[], headers: string[]): string {
  return (
    [
      headers.map(csvCell).join(","),
      ...rows.map((row) => headers.map((key) => csvCell(row[key])).join(",")),
    ].join("\r\n") + "\r\n"
  );
}
