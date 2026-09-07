# Security policy

v0.1.0 is an early self-hosted MVP. Only the latest published patch in the current
minor line will be supported once releases exist. No independent penetration
test, security certification or bug bounty is claimed.

## Reporting

After the public repository is created, enable GitHub **Private vulnerability
reporting** in Settings → Security. Use Security → Advisories → Report a vulnerability.
Do not publish exploit details, production records, passwords or database files
in a public issue. If that route is unavailable, contact the primary maintainer
privately through a previously established channel. A monitored private reporting
route is a public-launch gate; no invented security email address is supplied.

Provide affected version, reproduction steps using fictional data, expected vs
actual behavior, impact and any proposed fix. Reports will be reviewed according
to actual maintainer availability; there is no guaranteed response SLA. Coordinate
a fix and disclosure date with reporters. Advisory records must reflect observed
impact and tested affected versions.

## Implemented controls

- Salted, memory-hard scrypt passwords; bounded concurrency; no default accounts.
- Random, one-time bootstrap secret; transactional setup and last-owner protection.
- Opaque sessions, stored token digests, expiry, logout and password/role revocation.
- Per-account login throttling and exact-origin/JSON mutation checks.
- Server-side permission checks, strict schemas and parameterized database access.
- Bounded request bodies/import rows, atomic imports and versioned edits.
- Formula-neutralized CSV exports; no server-side fetching of resource links.
- Per-request script/style CSP nonces, no production unsafe-inline scripts,
  no framing, no MIME sniffing, no referrer, no shared caching and no indexing.
- Non-root Docker configuration; restrictive database and backup file modes.

## Threat model and limits

Protect against unauthenticated access, forged browser mutations, privilege
changes from request data, stored script injection, SQL injection, lost updates,
partial imports and accidental repository disclosure. An authenticated viewer can
read all installation records; the export restriction cannot stop manual copying.
Owners control users and rule packs. There is no tenant or field-level separation.

Host administrators, compromised operating systems and malicious owners are
outside that boundary. SQLite, snapshots and backups are not encrypted by the app.
Protect disks and access. There is no MFA, SSO, account email verification, automated
password recovery, IP-based global rate limit, malware scanning or upload support.
Per-account throttling can be abused to temporarily lock an account; put a small
public deployment behind a trusted reverse proxy with sensible request limits.

Resource URLs may lead to untrusted external sites when a user opens them; the
app does not fetch or endorse them. Age/nationality rules are user-supplied business
criteria, not an authoritative legal assessment. Archive is not data erasure.

## Release checks

Run the test suite, HTTP integration tests, lint, typecheck, clean install, build,
`npm audit --audit-level=high`, and the Docker CI smoke job. Review dependency and
base-image updates before merging. Use minimal GitHub workflow permissions and
protected default branches. See docs/QUALITY-AUDIT.md for checks actually executed
for this prepared version and anything still pending.
