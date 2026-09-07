# Localization and accessibility

The initial UI languages are English (`en`), French (`fr`) and Arabic (`ar`).
`src/ui/i18n.ts` stores each message as an EN/FR/AR tuple. The selected locale is a
non-secret first-party cookie. Server HTML has the correct `lang` and Arabic `dir=rtl`.
International country/currency codes remain machine-readable; dates use ISO format.

To change a translation, edit the corresponding tuple and run the translation
coverage test. Add a new UI key in all three languages. To add a language, extend
the Locale type, locale list, tuple type/data, locale-picker option, guide content
and tests. Native validation is browser-dependent; detailed schema diagnostics
currently retain English technical messages under translated error headings.

Use plain professional wording and explain missing data without implying failure.
New UI must have explicit labels, keyboard-operable controls, visible focus,
non-color status information and logical reading order. Avoid fixed-width layouts,
RTL overrides that reverse machine codes and placeholders as the only label.

The source includes a skip link, native dialogs with labelled headings, semantic
landmarks and tables, focus styles, 44-pixel main controls, logical CSS properties
and reduced-motion handling. These choices and JSX accessibility linting do not
establish WCAG conformance by themselves.

Before a public stable release: test keyboard-only CRUD/import, dialog focus
entry/return, error announcements, 200% and 400% zoom, 320/375-pixel layouts, long
French names, Arabic mixed-direction content, VoiceOver/Safari and NVDA/Firefox.
Use only fictional records in screenshots or defect reports. Record actual browser,
OS, assistive technology and findings; never invent a Lighthouse/axe score.
