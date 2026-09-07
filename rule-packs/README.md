# Community rule packs

Rule packs are versioned input, not built-in facts about football regulations.
No real association's eligibility rule is bundled with v0.1.

Each pack uses `schemaVersion: 1` and carries `name`, `jurisdiction`, `season`,
`source`, `lastVerified`, `verificationStatus`, `validFrom`, `validTo` and `checks`.
The public vocabulary maps to code as follows:

| Concept             | JSON field                                               |
| ------------------- | -------------------------------------------------------- |
| Last verified       | `lastVerified` (ISO date or null)                        |
| Verification status | `verificationStatus`: UNVERIFIED, VERIFIED or HISTORICAL |
| Validity window     | `validFrom`, `validTo` (inclusive ISO dates)             |

Checks currently support age bounds, allowed positions, allowed nationalities and
minimum official caps with explicit dates/levels. Squad foreign-player quotas,
registration windows, residency, exceptions, reciprocity and legal interpretation
are **not modeled**. Do not encode a team-level quota as a per-player guarantee.

Owners import a JSON array through Rules → Import. The fictional example is
UNVERIFIED, uses jurisdiction XX and an `example.test` link that is deliberately
not an official source. Its arbitrary age bounds illustrate syntax only.

A proposed real pack needs the primary published source, page/section reference,
applicable jurisdiction/competition/season, effective dates, reviewer name in the
PR, checked date, explanation of exceptions and tests for boundaries/missing data.
Respect source licenses; link to documents rather than redistributing proprietary
texts. A maintainer must assess provenance before accepting it. Re-check changes;
mark obsolete packs HISTORICAL, and never silently reuse old-season rules.

An owner-set VERIFIED label is an assertion by that operator, not independent
certification. Outside the validity window or before the verification date, checks
become advisory and a verification UNKNOWN keeps the result incomplete. Historical
evaluation still uses current profiles; the app does not reconstruct past records.

Authoritative input validation is in src/core/schemas.ts. Contribute fixtures for
supported checks, and propose new check types through a documented schema change.
