# Contributing

Welcome. Start with a small, reproducible problem or a documented workflow need.
The initial codebase was AI-assisted; no external contributor activity is claimed.
You do not need to be affiliated with the initiating agency to contribute.

1. Read README, ARCHITECTURE and the code of conduct. For vulnerabilities, use SECURITY.
2. Pick an unassigned issue or describe your proposal first if it changes architecture.
3. Fork/branch and use Node 24. Run `npm ci --ignore-scripts` and `npm run setup`.
4. Make a focused change. Include a failing test for a behavioral bug, then the fix.
5. Run `npm run check` and `npm run format:check`. Include command output and limits.
6. Open a pull request explaining the problem, resulting behavior and validation.

Use strict types and domain schemas; do not trust roles or validation from the UI.
Keep matching pure and explain failures/unknowns. Dates are UTC calendar dates;
salaries are monthly whole currency units. Never silently convert currencies.
Add all three UI translations for new keys, or explicitly discuss a translation
follow-up. See `docs/LOCALIZATION.md` for contributor instructions.

Use fictional fixtures with `example.test` resources. Never upload passports,
contracts, real player personal data, API tokens, databases or screenshots showing
private records. Rule-pack contributions require clear provenance and verification
metadata; the repository does not guarantee that a submitted rule is law.

Tests belong beside the relevant domain suite, with actual boundary/failure cases.
Do not add a test that only copies implementation logic. New adapters must meet
repository contract tests. Run the HTTP suite after building; it uses a disposable
workspace. UI changes need documented keyboard, mobile, RTL and screen-reader
checks before a stable release claim.

Use a clear commit subject and small reviewable commits. No mandatory CLA is
currently required; by intentionally submitting a contribution you agree to the
Apache-2.0 contribution terms and confirm your right to submit it. Keep applicable
third-party notices. Disclose substantial AI assistance and verify its output;
never auto-merge generated code or post artificial activity.

Maintainers review correctness, privacy, tests, accessibility and maintenance cost.
Disagreements should be resolved with evidence and a smaller experiment. There is
no guaranteed review SLA; reviewers should publish real availability, not promise
capacity they do not have.
