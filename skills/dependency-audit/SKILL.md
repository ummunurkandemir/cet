---
name: dependency-audit
description: Flags outdated or vulnerable dependencies before merge by cross-referencing the project's manifest/lockfile against known advisories and upstream versions, then recommends the lowest-risk remediation. Use before a merge or release, not for performing the actual upgrade (see dependency-upgrader agent for that).
allowed-tools: Read, Bash, Grep, Glob
---

# Dependency Audit

## Purpose

Catch dependency risk — known vulnerabilities, abandoned packages, major version drift — before it ships, and report it with enough specificity (which package, which advisory, which fix) that acting on it doesn't require a second investigation. This skill only audits; it does not change any files.

## When to Use

Use this skill when:

- A PR adds, removes, or bumps a dependency and the change needs a risk check before merge.
- Run as a scheduled or pre-push check across the full manifest, not just the diff.
- Someone asks "is it safe to merge this" and a new/changed dependency is part of the answer.

Do **not** use this skill for:

- Actually performing an upgrade and running tests against it — that's `dependency-upgrader`'s job.
- Auditing application code for vulnerabilities (injection, auth, etc.) — see a security-review skill for that; this skill is scoped to third-party dependencies.
- License compliance review, unless the project's policy explicitly ties license risk into this same report (state clearly if out of scope for a given repo).

## Inputs

| Input | Required? | Why it matters |
|---|---|---|
| Manifest file(s) (`package.json`, `go.mod`, `requirements.txt`, `Cargo.toml`, etc.) | Required | Defines the declared dependency set and version ranges |
| Lockfile (`package-lock.json`, `go.sum`, `poetry.lock`, etc.) | Strongly recommended | Declared ranges lie about what's actually installed; the lockfile is ground truth |
| Advisory data source availability (`npm audit`, `pip-audit`, `govulncheck`, OSV, GitHub Advisory DB, etc.) | Required | Without a live source, findings are limited to what's already known/cached |
| Diff scope (if auditing a PR rather than the whole repo) | Recommended | Narrows the report to what actually changed, not every pre-existing issue |
| Project's risk tolerance / policy (if documented) | Optional | Some orgs block on any High+, others only on Critical with a known exploit |

## Instructions

1. **Inventory the dependency set.** Read the manifest and lockfile together — report on what's actually resolved/installed, not just the declared range.
2. **Run the ecosystem's audit tool via `Bash`** where available (`npm audit --json`, `pip-audit`, `govulncheck`, `cargo audit`, etc.). Prefer machine-readable output over parsing prose.
3. **Cross-check flagged packages individually.** For each advisory, confirm: is the vulnerable code path actually reachable from this project's usage (not just present in `node_modules`), what's the fixed version, and is it a direct or transitive dependency (transitive fixes often require bumping the parent, not the leaf).
4. **Check for staleness beyond CVEs.** Flag packages with no release in 2+ years, a deprecation notice, or a major version behind current — these are risk even without a known CVE (unmaintained = future CVEs go unpatched).
5. **Classify each finding by severity and reachability**, not by the advisory's raw CVSS score alone — a Critical CVE in an unreachable code path is lower real risk than a Medium one on a hot path.
6. **Recommend the smallest safe remediation** per finding: a patch/minor bump when semver-compatible, a note that a major bump is needed (with what it likely breaks) when not, or "no fix available yet — mitigate by X" when neither exists.
7. **Report**, grouped by severity, each entry naming: package, current version, vulnerable range, advisory ID/link, fixed version, and whether it's direct or transitive.

## Best Practices

- **Reachability over raw score.** A vulnerable function never called by this codebase is real but lower priority than the audit tool's default severity implies — say so explicitly.
- **Distinguish "fix available" from "fix requires a major bump."** The latter needs a human decision, not an automatic recommendation.
- **Don't recommend blind `npm audit fix --force` or equivalent.** That can silently pull in breaking major versions — recommend the specific target version instead.
- **Report transitive dependencies clearly.** "Bump `lodash`" is wrong advice if `lodash` is pulled in transitively by `some-framework` — the real fix is bumping the parent or overriding the resolution.
- **State what wasn't checked.** If the audit tool's data source is stale, offline, or a private registry blocks lookups, say so rather than presenting a partial scan as complete.

## Limitations

- **Only as current as the advisory source.** A same-day CVE may not appear yet in the audit tool's database.
- **Cannot verify a fix works** — it recommends the target version; confirming the upgrade doesn't break the build/tests is `dependency-upgrader`'s job.
- **Private/internal packages** without public advisory coverage can only be flagged for staleness, not scanned for known vulnerabilities.
- **Reachability analysis is best-effort**, based on how the package is imported/used in this repo — it is not a full call-graph proof.
