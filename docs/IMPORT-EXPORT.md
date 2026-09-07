# Import and export

Collections support CSV or JSON. Owners/editors may import/export business
records; only owners may import rule packs. Viewers may read records but do not
have the bulk-export endpoint. Imports are inserts, not upserts or overwrites.

1. Use **Import → template** for the collection's exact CSV header names.
2. Choose a file (UTF-8, at most 1 MiB and 500 records).
3. Review validation and the first five rows; preview creates nothing.
4. Confirm import. If any insertion fails, all inserted rows/audit entries roll back.

CSV uses a header row, commas, RFC-style double-quoted cells and doubled embedded
quotes. BOM and CRLF are supported. Unknown/duplicate headers, malformed quotes,
invalid values and duplicate supplied IDs are errors. Fields are case sensitive.
Use the API/domain names, not translated UI labels.

| Value                         | CSV                                     | JSON               |
| ----------------------------- | --------------------------------------- | ------------------ |
| Missing date/number/reference | Empty cell                              | null or omitted    |
| Date                          | `2026-09-07`                            | `"2026-09-07"`     |
| Amount                        | Whole currency units, e.g. `2500`       | Integer or null    |
| Boolean                       | `true` or `false`                       | true or false      |
| Tags/positions/countries      | Semicolon separated, e.g. `LW;RW`       | Array of strings   |
| Caps/rule checks              | JSON array in a quoted CSV cell         | Array of objects   |
| Identifier                    | Optional UUID; preserve for linked data | Optional `id` UUID |

JSON is an array of data objects. Minimal fictional player example:

```json
[
  {
    "name": "Example Forward — fictional",
    "dateOfBirth": "2003-01-01",
    "nationalities": ["XX"],
    "positions": ["ST"],
    "availability": "FREE_AGENT",
    "monthlySalary": 2500,
    "currency": "EUR"
  }
]
```

Minimal opportunity: `title` and two-letter `country`. Minimal club: `name` and
`country`. Minimal coach: `name`. A mandate needs `playerId`, `startDate`, `endDate`;
a pipeline entry needs `playerId`, `opportunityId`. Rules need the metadata in
rule-packs/examples. Schemas in `src/core/schemas.ts` are authoritative.

Import clubs and rule packs first, players and opportunities second, mandates and
pipeline last. Preserve IDs from exports. Referenced records must already exist;
preview validates them. Fresh UUIDs are generated for missing IDs. Existing IDs
cause a conflict instead of overwriting records. Importing a JSON/CSV export does
not carry accounts, sessions, audits, archive state or edit versions; use a database
backup for a complete installation restore.

Exports include active records and IDs. CSV cells that could be spreadsheet
formulas receive a protective apostrophe. Re-import recognizes that protective
prefix, but an intentionally identical original apostrophe prefix is ambiguous;
use JSON for exact archival round trips and database backup for complete recovery.
Never remove the protection to open untrusted spreadsheets without review.

The server accepts a bounded JSON envelope and separately enforces decoded
content size. Heavily escaped content may hit the envelope bound below 1 MiB.
Do not scrape or import licensed data without permission. Import logs do not store
raw uploaded file bodies; record contents remain private installation data.
