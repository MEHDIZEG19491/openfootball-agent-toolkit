# Internal HTTP API — v0.1

This API supports the first-party UI. It is not yet a promised stable external
integration contract. No API keys or cross-origin access are supported. Responses
are JSON except explicit exports. Authenticated responses are `no-store`.

| Method and route                                    | Purpose / permission                                     |
| --------------------------------------------------- | -------------------------------------------------------- |
| GET /api/health                                     | Unauthenticated process/database query health            |
| POST /api/auth/setup                                | First owner; configured bootstrap token + exact origin   |
| POST /api/auth/login                                | Credentials; returns HttpOnly session cookie             |
| POST /api/auth/logout                               | Revoke current session                                   |
| POST /api/auth/password                             | Current password + replacement; revoke all user sessions |
| GET /api/users                                      | Owner-only user list without credential fields           |
| POST /api/users                                     | Owner-only create with name/email/password/role          |
| PATCH /api/users/:id                                | Owner-only role change and revocation                    |
| GET /api/records/:entity                            | All active records; any authenticated role               |
| GET /api/records/:entity/:id                        | One active record                                        |
| POST /api/records/:entity                           | Create; editor/owner, rules owner-only                   |
| PATCH /api/records/:entity/:id                      | `{version,data}` full domain record edit                 |
| DELETE /api/records/:entity/:id                     | `{version}` archive, not erase                           |
| POST /api/import/:entity                            | `{format,content,dryRun}`; preview defaults true         |
| GET /api/export/:entity?format=csv                  | Owner/editor bulk export; json also supported            |
| GET /api/matches?opportunityId=UUID&asOf=YYYY-MM-DD | Explained matching against current profiles              |
| POST /api/demo                                      | Owner-only fictional data, empty workspace required      |

Entities: players, coaches, clubs, opportunities, mandates, pipeline, rules.
All mutations require `Content-Type: application/json` and exact `Origin` equal to
APP_ORIGIN. Credentials use the session cookie. A browser-supplied role is never
authoritative. IDs must be UUIDs and request objects are strict allowlists.

Errors use `{error: "code"}`; validation adds field-path/message issues. Codes
include unauthorized (401), forbidden/originRejected (403), notFound (404),
versionConflict/duplicateRecord/recordInUse (409), tooLarge (413), jsonRequired
(415), tryLater (429) and serverError (500). Unknown raw exceptions are not returned.
Default request limit is 16 KiB; record edits allow 128,000 bytes; import envelopes
allow 1,150,000 bytes with separate 1 MiB content/500-row limits.

Dates and schema fields are documented in core types and import guide. No pagination
exists yet; callers should not infer support for large datasets or public API SLAs.
