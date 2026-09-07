# Architecture

## Boundaries

| Layer          | Responsibility                                                                           | Must not do                                            |
| -------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `src/core`     | Types, strict input schemas, UTC dates, CSV parsing, permission matrix, pure matching    | Network access, database calls, framework dependencies |
| `src/server`   | SQLite repository, transactional imports, authentication, sessions, audit, demo fixtures | Trust browser roles or expose password/session hashes  |
| `src/app`      | Authenticated server pages, HTTP routing, validation/error mapping                       | Bypass domain schemas or per-operation authorization   |
| `src/ui`       | Localized forms, record lists, explanations, navigation                                  | Decide authoritative eligibility or permissions        |
| `src/proxy.ts` | Per-request CSP nonce and private cache headers                                          | Be the only authorization barrier                      |

The browser sends JSON to same-origin endpoints. Mutations require an authenticated
session, role permission, exact `Origin` and JSON content type. Setup/login are
anonymous but origin-checked; setup additionally requires a one-time server secret.
Server pages independently verify the session before loading private records.

## Storage decision

v0.1 targets a small team and one organization per installation. SQLite reduces
setup to one Node process and one local data directory, and supports transactional
imports without an external account. Node 24's built-in SQLite avoids native npm
driver installation scripts. These benefits justify deferring PostgreSQL/Prisma.

Records are strict validated JSON documents inside an indexed relational table;
identity, entity kind, version, timestamps and archival state are relational
columns. Users and sessions are separate tables. Audit entries record the actor,
action and identifiers, never raw profile or password contents. All queries use
parameters; the few interpolated clauses come from internal fixed enums/booleans.

Initialization is transactional and idempotent. `schema_migrations` currently
contains version 1. Future migrations must be numbered, backed up, tested against
a preceding version and applied in one transaction where SQLite permits it.

Repository writes enforce reference existence. Archiving an in-use parent fails
instead of orphaning children. Duplicate active player/opportunity pipeline pairs
are rejected. Updates require the current record version; stale edits receive 409.
Imports preserve optional UUIDs and commit all records and audit entries or none.
Archived records remain in the database; archive is not deletion or erasure.

SQLite statements execute synchronously on one Node process. Password derivation
is asynchronous with at most two concurrent hashes. Lists and matching currently
read the full active collection; no silently truncated exports. Pagination,
streaming exports and measured scale limits are work for v0.2. Do not infer a
capacity or latency guarantee from the presence of an index.

## PostgreSQL path

Keep public record schemas and pure matching stable. Introduce a repository port
and asynchronous methods, then implement a PostgreSQL adapter with relational
foreign keys, transactional audit, unique pipeline pairs and version checks. Run
the same repository contract suite against both adapters. Supply an explicit
migration tool preserving identifiers, users and relationships. Do not share a
SQLite file across replicas or a network filesystem; a multi-replica deployment
requires a different persistence design.

## Authentication and deployment

Opaque 256-bit session tokens are kept only in HttpOnly, SameSite=Strict cookies;
SHA-256 digests are stored in SQLite with a 24-hour expiry. Role/password changes
revoke sessions. Passwords use salted scrypt, N=131072/r=8/p=1. First setup closes
transactionally once an owner exists. The last owner cannot be demoted.

This is not federated identity or tenant isolation. All three roles can read the
organization's records; a viewer can still copy data they can see. No field-level
secrets, file hosting, email delivery or external APIs exist in v0.1.

Deploy the compiled standalone Next server on a Node 24 host with a persistent
local volume, or use the Docker configuration. This application is not a static
GitHub Pages site and is not suitable for an ephemeral serverless filesystem.

## Decisions and evidence

- No black-box/AI matching, live currency feeds, scraping or unverified laws.
- Explicit date input makes matching reproducible; UTC controls date boundaries.
- Unverified/expired rule packs produce advisory criteria plus an incomplete
  verification condition; they cannot silently certify eligibility.
- Localized dictionaries are data; country/currency codes remain interoperable.
- Native forms/dialogs, visible focus and text status labels support accessibility;
  formal browser/screen-reader verification remains a separate gate.
- A narrow local ESLint RuleContext adapter bridges four removed accessor methods
  used by Next's bundled plugin. Remove it once upstream supports ESLint 10;
  it does not disable lint rules or alter application runtime behavior.
