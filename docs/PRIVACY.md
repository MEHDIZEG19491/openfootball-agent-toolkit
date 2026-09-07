# Privacy and data handling

Each installation controls its own data. The software does not require a cloud
account, public roster, OpenAI API key, analytics service or external database.
Normal application operation makes no outbound API or telemetry calls. Software
installation and explicit dependency audits contact package registries; opening
an external resource link contacts that resource provider from the user's browser.

Stored data includes user name/email/password hash, session digests/expiry,
login-attempt email digests, entered records and minimal audit events. All user
roles read the installation's records. Choose separate installations for separate
organizations; this is not tenant separation or a rights-management system.

Keep collection limited to a legitimate, agreed purpose and follow applicable
requirements. Do not add sensitive health, passport or children's information
merely because a notes field exists. Obtain appropriate permissions before storing
or sharing data. The software does not determine consent or legal basis for you.

SQLite and backups are plaintext storage at rest. POSIX file permissions were tested on Linux; on Windows, configure restricted
NTFS access explicitly. File permissions do not replace encrypted disks, host access controls, HTTPS, protected backups and
an operator retention policy. Never commit runtime files, exports containing real
data, environment secrets or screenshots of private profiles to public GitHub.

Archive only changes visibility; records and audit identifiers remain in storage.
Active-record exports are not full database backups. Permanent erasure and
selective audit retention need operator procedures and future product support.
Do not claim deletion after pressing Archive. Delete obsolete offline exports and
backups according to your documented retention obligations.

No application error logs intentionally include raw profiles, submitted passwords,
bootstrap secrets or session tokens. Operators must separately review reverse
proxy/host logging. A repository release archive excludes runtime storage and
private application-preparation material. Review that exclusion before every release.
