# User guide

## Roles and access

| Capability                               | Owner | Editor | Viewer |
| ---------------------------------------- | ----- | ------ | ------ |
| Read all records and matching results    | Yes   | Yes    | Yes    |
| Create/edit/archive records and import   | Yes   | Yes    | No     |
| Bulk export                              | Yes   | Yes    | No     |
| Manage rule packs and verification state | Yes   | No     | No     |
| Create users/change roles/load demo      | Yes   | No     | No     |
| Change own password/logout               | Yes   | Yes    | Yes    |

A viewer can still copy what they can read. Use a separate installation if a team
must not see another team's records. User and password changes revoke affected
sessions. The last owner cannot be demoted. Keep owner credentials recoverable in
a password manager; automated password reset is not part of v0.1.

## Records

Create clubs first so players/opportunities can link to them. Use `GB`, `FR`, etc.
for country codes and `EUR`, `USD`, etc. for currencies. Unknown dates and amounts
are empty/null, never a made-up date or zero. Salaries are monthly whole currency
units; zero is a known value, not “unknown.” There is no assessed market valuation.
Resource fields store http(s) links, not documents uploaded to this application.

Use the search and status filter to narrow each collection. Open a card to review
or edit it. An edit conflict means someone changed the record since you opened it;
close and reload the latest version before entering your change again. Do not
blindly overwrite colleagues' updates.

Archiving hides a record without erasing it. A referenced player/club/opportunity
cannot be archived until dependents are archived or unlinked. Archive recovery and
permanent erasure are not UI features in v0.1; retain backups and apply a retention
policy. Bulk exports include active records only.

## Opportunities and matching

Only fill criteria the club actually requires. Specify age as inclusive bounds,
a currency and cap window explicitly. A `MATCH` means every recorded binding
criterion passed with supplied data; it is not a guarantee of suitability or
registration eligibility. An `INCOMPLETE` result needs more information, while
`NO_MATCH` has at least one failed condition. Read the explanations, not only score.

Caps are entered by date, level, official/friendly status, count and source URL.
Do not double-count overlapping reports or use aggregate totals and their
individual matches together. v0.1 trusts the entered evidence, does not fetch the
source and cannot detect all duplicated sporting events. Check `capsComplete`
only when the history is actually complete for evaluation purposes.

The evaluation date controls age, deadlines, cap cut-off and rule validity. It
uses the current stored profile and opportunity: selecting a historic date does
not restore past salary, availability or contract facts.

## Pipeline and mandates

Add a player to a specific opportunity from Matching, or create a pipeline record.
The twelve stages are recorded workflow states; there are no enforced legal
transition rules or automated club messages. Edit the stage and notes as the work
progresses. Only one active record for the same player/opportunity is permitted.

Mandates record dates, status, exclusivity and a document link. A record does not
create a mandate, prove authorization or validate a contract. Dashboard alerts
show ACTIVE mandates ending within the next 30 days, including today. There are
no background email/push notifications. Obtain qualified advice when needed.

## Rule packs

Only an owner can record a pack or mark it verified. `VERIFIED` is the operator's
assertion backed by a source and verification date; it is not third-party review
by this software. Review current jurisdiction/season/validity and evidence before
using a pack. Unverified, historical, unavailable or expired packs are flagged and
cannot certify a complete positive result. See rule-packs/README.md.
