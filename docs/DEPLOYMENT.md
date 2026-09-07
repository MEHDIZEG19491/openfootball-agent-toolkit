# Deployment and operations

## Supported shape

Node.js 24, a persistent local filesystem and one application instance per database.
The compiled Next standalone server is used by both npm start and Docker. Do not
use static GitHub Pages, an ephemeral serverless filesystem, a network-mounted
SQLite database or multiple replicas against this file. PostgreSQL is future work.

Quick start is in README. `npm run setup` never overwrites an existing `.env`.
If you copied the example manually, replace its token placeholder before setup.
The container reads Compose environment variables, not an embedded `.env`.

## Self-hosting behind HTTPS

1. Run the container/Node process on loopback behind a reverse proxy you administer.
2. Terminate HTTPS at that proxy and set `APP_ORIGIN=https://your-actual-host`.
3. Configure the proxy to preserve Host and scheme information, avoid shared caching
   of this application, bound requests to roughly 2 MiB, and apply rate limits.
4. Set `COOKIE_SECURE=true`, persist only required directories and restart.
5. Complete owner setup over HTTPS, then remove the bootstrap environment value.
6. Verify login, access rejection, cookie Secure/HttpOnly/SameSite, role changes,
   backups and restore on that deployment before importing real data.

No domain, TLS provider or deployment is created automatically. Do not expose the
first-run setup token or invent deployment success. Use container/image scanning
and patch the Node base image. The official Node 24 base tag is currently floating;
pin a reviewed digest in a published deployment and update it deliberately.

## Backups and restore

For a Node installation:

```sh
npm run backup
npm run backup -- /absolute/private/location/snapshot.sqlite
```

The script uses SQLite's online backup API, including committed WAL data, checks
integrity and refuses to overwrite an existing destination. It is not equivalent
to copying only the live `.sqlite` file while the app is writing.

For Docker:

```sh
docker compose exec toolkit node scripts/backup.mjs
```

The verified snapshot is created in the backup volume. Copy it to protected storage
using the actual reported filename:

```sh
docker compose cp toolkit:/app/private/backups/ACTUAL-FILENAME.sqlite ./private-snapshot.sqlite
```

Restore to a **new** installation/directory, with the application stopped. Make a
separate backup of the destination first. Copy the verified snapshot to its new
`DATABASE_PATH`, use mode 0600/owner access, and start the application. Do not copy
old `-wal` or `-shm` files over the restored database. Validate account access,
record counts, references and matches using known fixtures before switching users.
A backup includes password hashes and session records; restrict access and have
users change passwords if exposure is suspected. Operators should arrange
scheduled backups externally; no background scheduler is included in v0.1.

## Updates

Read the changelog and migration instructions, back up, stop the service, deploy
the reviewed version and test health/workflows before use. Do not downgrade a
migrated database without a compatible snapshot. Rehearse restore periodically.
Application health confirms the process can query SQLite, not that all workflows
or data are correct.

## Recovery and current limits

Another owner can manage roles, but automated password reset/email recovery is
not available. Use a password manager and ensure trusted owner continuity. Account
recovery/MFA is a tracked security priority, not an advertised finished feature.
Archive restore/erasure tools, migration rollback automation, multi-instance
operation and performance tuning are also future work.
