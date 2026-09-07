# Preparing and publishing a release

The independent public source repository is
[MEHDIZEG19491/openfootball-agent-toolkit](https://github.com/MEHDIZEG19491/openfootball-agent-toolkit),
created by the project owner. Publishing source does not certify production
readiness or create a versioned GitHub release. Check the actual
[workflow results](https://github.com/MEHDIZEG19491/openfootball-agent-toolkit/actions)
and the validation report before preparing a prerelease.

## Public-launch gates

- Read docs/QUALITY-AUDIT.md and complete browser checks plus Docker record-write
  and backup-restore verification; preserve the passing CI smoke, clean-install
  and dependency-audit gates.
- Human maintainer reviews the AI-assisted implementation, sets their actual git
  identity, accepts maintainership and establishes a monitored private security
  and conduct-reporting route. Enable private vulnerability reporting.
- Review the repository visibility and README links, and configure
  default-branch protection/required CI.
- Verify the archive contains no private data. Never add `.env`, runtime databases,
  backups, real profiles or `docs/OPENAI-OSS-APPLICATION.md` to public git.

The starter local commit uses an explicitly non-personal bootstrap author, not
fabricated historical contributions. A maintainer can preserve it with clear
attribution or create their reviewed initial commit using their own git identity.

## Commands

After extracting the source bundle into a new directory, reviewing it and creating
the actual repository, initialize git if needed and commit only reviewed public
source. Configure the real remote through your normal authenticated git client.
No token belongs in a remote URL or file.

```sh
npm ci --ignore-scripts
npm run check
npm run format:check
npm run audit:dependencies
npm run release:prepare
```

The release script requires a clean committed tree, validates public file paths,
rejects symlinks/private/runtime files, and archives HEAD. It writes a source ZIP,
SHA256SUMS and a source manifest under ignored `release/`. It does not publish,
create a remote repository, send messages or add stars/issues.

To publish using GitHub, run the **Prepare draft release** workflow from the reviewed
commit and enter the exact package.json version. It first calls CI and dependency
security workflows, then creates a **draft prerelease** using the versioned release
notes. Review its assets, limitations and source commit before publishing. Never
rewrite an already published release/tag; issue a patch instead.

Workflow definitions use official Actions v7 tags checked against upstream
documentation; the Actions tab records actual execution. Pin reviewed
commit SHAs in a maintained deployment policy; Dependabot proposes updates. Write
permission is confined to the draft-release job; PR jobs use read permission and
never use pull_request_target to execute untrusted code.

## Community preparation

`npm run community:prepare` generates a local preview of 16 substantive starter
issues, 12 labels and five milestones. Read and edit the plan before applying it.

The initial source publication opened all 16 starter issues with their topic
labels. Each body records its intended milestone. The connected publishing tool
does not expose milestone creation, so the five milestone objects are still
pending. The script below creates missing milestones but preserves existing
issues; assign those existing issues to their recorded milestone in GitHub after
running it. Existing label colors and descriptions are also preserved.

To apply it to the **actual chosen repository**, an authorized maintainer may run:

```sh
node scripts/community.mjs --apply --repo=MEHDIZEG19491/openfootball-agent-toolkit
```

Provide a narrowly scoped `GH_TOKEN` or `GITHUB_TOKEN` in the environment using your
normal secure mechanism; do not paste it into documentation or git. The command
creates missing labels/milestones and issues, skips matching markers or titles,
and does not modify existing issue content. It is never run automatically during
installation. These are real backlog tasks, not engagement manipulation.

## Version policy

Use SemVer. Before v1.0, explicitly announce breaking schema changes in a minor
release with migration/backup instructions. Patch releases fix compatible behavior.
Review source, lockfile, rule metadata and restoration steps for every release.
No private grant-application preparation belongs in a public release.
