# Changelog

Format follows semantic versioning. This file distinguishes preparation from
publication; the GitHub release timestamp will be the actual release date.

## 0.1.0 — prepared, not yet published

### Added

- Self-hosted Node 24 / Next.js / SQLite workspace and one-time owner setup.
- Role permissions, password sessions, user management and audit events.
- Players, coaches, clubs, opportunities, mandates and twelve pipeline stages.
- Deterministic explained matching with missing-data and rule-verification states.
- Versioned rule-pack input schema and an explicitly fictional example.
- English, French and Arabic UI with responsive/RTL styling.
- Previewed atomic CSV/JSON import, export, conflict protection and online backups.
- Domain/database/authentication tests and production HTTP integration tests.
- Docker setup, CI/security/release workflow definitions and contribution docs.

### Limits

- One organization/process per installation; full-collection lists; no scale benchmark.
- No file uploads, coach matching, email alerts, SSO/MFA or PostgreSQL adapter.
- Rule data is not independently validated; no real regulation pack is bundled.
- Docker/browser/accessibility and fresh dependency checks have the execution
  status recorded in docs/QUALITY-AUDIT.md.
