import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
const plan = JSON.parse(readFileSync("docs/community/starter-issues.json", "utf8"));
const apply = process.argv.includes("--apply");
const repository = process.argv.find((arg) => arg.startsWith("--repo="))?.slice(7);
if (!apply) {
  mkdirSync("release", { recursive: true });
  writeFileSync(
    "release/community-plan.md",
    "# Proposed community work\n\nThese are prepared tasks, not existing activity.\n\n" +
      plan.issues
        .map(
          (i) =>
            `## ${i.title}\n\n${i.body}\n\nLabels: ${i.labels.join(", ")}\nMilestone: ${i.milestone}\n`,
        )
        .join("\n"),
  );
  console.log(
    `${plan.issues.length} issues, ${plan.labels.length} labels and ${plan.milestones.length} milestones prepared in release/community-plan.md. No GitHub request was sent.`,
  );
} else {
  if (!repository || !/^[-\w.]+\/[-\w.]+$/.test(repository))
    throw new Error("Use --repo=OWNER/REPOSITORY with --apply.");
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  if (!token)
    throw new Error(
      "Supply a repository-scoped token via GH_TOKEN or GITHUB_TOKEN; never commit it.",
    );
  const root = `https://api.github.com/repos/${repository}`;
  async function api(path, method = "GET", data) {
    const response = await fetch(root + path, {
      method,
      signal: AbortSignal.timeout(20000),
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: data ? JSON.stringify(data) : undefined,
    });
    if (!response.ok)
      throw new Error(
        `GitHub ${method} ${path.split("?")[0]} returned ${response.status}. No token or response body is logged.`,
      );
    return response.json();
  }
  async function list(path) {
    const result = [];
    for (let page = 1; page <= 100; page++) {
      const rows = await api(
        `${path}${path.includes("?") ? "&" : "?"}per_page=100&page=${page}`,
      );
      result.push(...rows);
      if (rows.length < 100) return result;
    }
    throw new Error("Repository listing exceeded the safe page limit.");
  }
  console.log(
    `Applying reviewed starter plan to ${repository}. Existing matching issues are preserved.`,
  );
  const labels = await list("/labels");
  for (const label of plan.labels)
    if (!labels.some((item) => item.name === label.name))
      await api("/labels", "POST", label);
  const milestones = await list("/milestones?state=all");
  for (const milestone of plan.milestones)
    if (!milestones.some((item) => item.title === milestone.title))
      milestones.push(await api("/milestones", "POST", milestone));
  const issues = await list("/issues?state=all");
  let created = 0;
  for (const issue of plan.issues) {
    const marker = `<!-- ofat-starter:${issue.id} -->`;
    if (issues.some((item) => item.body?.includes(marker) || item.title === issue.title))
      continue;
    const result = await api("/issues", "POST", {
      title: issue.title,
      body: issue.body + "\n\n" + marker,
      labels: issue.labels,
      milestone: milestones.find((m) => m.title === issue.milestone).number,
    });
    issues.push(result);
    created++;
  }
  console.log(
    `Created ${created} substantive starter issues. No stars, forks, users or adoption were generated.`,
  );
}
