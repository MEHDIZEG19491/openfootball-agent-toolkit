# Third-party software

This source bundle excludes node_modules and contains no third-party player
or club database. Dependencies are installed from the lockfile. Their licenses
remain separate from this project's Apache-2.0 license.

| Direct runtime dependency | Version | License declared by package |
| ------------------------- | ------- | --------------------------- |
| Next.js                   | 16.3.4  | MIT                         |
| React                     | 19.2.8  | MIT                         |
| React DOM                 | 19.2.8  | MIT                         |
| Zod                       | 4.5.4   | MIT                         |

Node.js 24 supplies SQLite and its own runtime/component license notices. Tailwind,
TypeScript, ESLint and the other development tools retain the licenses included in
the installed packages. package-lock.json records resolved versions and integrity
hashes; it is not a complete legal opinion or a binary distribution notice bundle.

If you distribute a compiled server/container, preserve license notices from all
bundled packages and the base image. Review transitive licenses and changes before
publication. No external font, photograph, agency logo or proprietary dataset is
bundled. The project's Apache license text was taken from the standard license
included with TypeScript; that does not attribute this project's code to Microsoft.

Reference documentation: [Next.js CSP](https://nextjs.org/docs/app/guides/content-security-policy),
[Node SQLite](https://nodejs.org/api/sqlite.html),
[ESLint 10 migration](https://eslint.org/docs/latest/use/migrate-to-10.0.0),
[Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0).
