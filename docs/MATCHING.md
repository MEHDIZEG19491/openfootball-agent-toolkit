# Explainable matching, version 1

The engine is a pure function: `matchPlayer(player, opportunity, asOf, rule?)`.
It returns criterion statuses, expected/actual values, source, advisory flag,
evaluation date, score and overall classification. It has no network or AI calls.

| Criterion      | Behavior                                                                                                                   |
| -------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Position       | Any recorded player position in the allowed set; empty profile set is unknown.                                             |
| Age            | Calendar age on the UTC evaluation date; bounds inclusive; absent/future birth date unknown.                               |
| Nationality    | Any supplied nationality in allowed set; dual nationality is an OR.                                                        |
| Availability   | Any allowed state, but `UNKNOWN` never passes as affirmative availability.                                                 |
| Monthly salary | Whole-unit expectation inside min/max; missing or differing currency unknown.                                              |
| Transfer fee   | Expected fee at or below budget; missing or differing currency unknown.                                                    |
| Caps           | Sum of official, sourced entries within inclusive dates, eligible levels, not after evaluation date.                       |
| Opportunity    | Closed or past deadline is a failure; deadline day itself remains open.                                                    |
| Rule pack      | Verified current checks bind; unverified/historical/out-of-date packs are advisory plus an unknown verification criterion. |

Meeting the documented cap threshold is a pass. Being below it is a failure only
when `capsComplete` is true; otherwise the history may be incomplete, so status is
unknown. Source URLs are user-provided evidence references, not automatically
verified proof. Counts may represent multiple appearances; overlapping rows are
not deduplicated by event identity in v0.1.

For every binding criterion, PASS/FAIL/UNKNOWN have equal weight. The score is the
rounded percentage of binding criteria that passed. Unknowns stay in the
denominator. Advisory criteria do not contribute. Any binding failure gives
NO_MATCH regardless of score; otherwise unknowns give INCOMPLETE. No conditions
also gives INCOMPLETE and zero. All binding conditions passing gives MATCH.

This is requirement completeness/compatibility, not talent quality, success
probability or legal eligibility. The engine does not infer unrecorded criteria,
convert currencies or silently merge inconsistent source rules.

Tests cover birthdays/leap dates, inclusive bounds, zero vs missing amounts,
different currencies, dual nationality, missing availability, cap windows/levels,
friendlies and missing sources, history completeness, high-score failures,
missing/unverified/expired rules and opportunities. The date is reproducible but
is evaluated against current stored facts, not historical snapshots.
