---
name: migration-planner
description: Breaks a large refactor or migration into a sequenced series of independently reviewable, independently shippable commits, each one leaving the repository green. Use when planning how to land a change too large to review in one diff, not for executing the refactor itself.
allowed-tools: Read, Bash, Grep, Glob
---

# Migration Planner

## Purpose

Turn "we need to migrate X to Y" into an ordered list of commits, each small enough to review properly and safe enough to ship on its own. This skill exists because large refactors fail in a predictable way: they land as one 3,000-line diff nobody can review, or they stall half-finished with two competing patterns in the codebase and no record of which one is current.

This skill plans; it does not refactor. The output is a sequence, not a changed file.

## When to Use

Use this skill when:

- A refactor, framework upgrade, or API migration is too large to review as a single diff.
- Work must ship incrementally — the branch can't sit unmerged for weeks without conflicting.
- A previous migration attempt stalled and the remaining work needs to be re-sequenced from the current state.
- A risky change (data model, auth, shared library) needs an explicit rollback point at each step.

Do **not** use this skill for:

- Performing the migration — this produces a plan, and the steps are executed separately (by an engineer or by `bug-fixer`/an implementation agent per step).
- A change that already fits in one reviewable commit. Splitting a 60-line change into five commits adds process cost with no review benefit.
- Deciding *whether* to migrate. This skill assumes the decision is made and plans the path.

## Inputs

| Input | Required? | Why it matters |
|---|---|---|
| The target end state (framework version, new API, new pattern) | Required | Without a concrete destination, steps can't be ordered or verified |
| The current state — files/modules using the old pattern | Required | Established by the skill via `Grep`/`Glob`; defines the actual scope, which is usually larger than assumed |
| Test suite and how to run it | Required | Every step must be verifiable; a step with no way to prove it's green isn't a step |
| Build/type-check commands | Strongly recommended | Determines whether intermediate states (both patterns coexisting) actually compile |
| Deployment/release cadence | Recommended | Decides whether steps can ship independently or must land behind a flag |
| Known constraints (frozen files, other teams' in-flight work, deprecation deadlines) | Optional | Reorders steps to avoid conflicts that would force a rebase-from-scratch |

## Instructions

1. **Establish the real scope.** Use `Grep`/`Glob` to find every usage of the old pattern — imports, call sites, tests, config, docs, generated code. Report the count and the list; do not plan against an assumed scope.
2. **Confirm the baseline is green.** Run the test suite and build via `Bash` before planning. If the repo is already red, that's step zero and the plan says so.
3. **Identify the seam** — the point where old and new can coexist. Usually an adapter, a facade, a compatibility shim, or a feature flag. Migrations without a seam force a big-bang cutover; if none exists, the first step is creating one.
4. **Order steps by dependency, then by risk.** Prerequisites first (add the new API alongside the old), leaves before roots (migrate call sites before removing the old implementation), riskiest-with-most-review-attention while the branch is still small.
5. **Size each step to a reviewable diff** — a few hundred lines at most, one conceptual change. If a step can't be described in one sentence without "and," split it.
6. **Give every step a verification command and a rollback.** Each step must leave the build green, the tests passing, and the repo shippable. A step that requires the next step to compile is not a step — merge them or find a different seam.
7. **Mark which steps are mechanical and which need judgment.** Mechanical steps (codemod, rename, import rewrite) can be batched or automated; judgment steps (behavior changes, ambiguous call sites) need a human reviewer and their own commit.
8. **Include the cleanup step explicitly** — removing the old implementation, the shim, and the flag. Migrations that omit this are the ones that leave two patterns in the codebase forever.
9. **Report the plan** as an ordered list: step number, one-line intent, files touched, verification command, rollback, mechanical-vs-judgment, and rough size.

## Best Practices

- **Every step ships green.** The plan's core invariant: any prefix of the sequence can be merged and deployed without the rest.
- **Add before removing.** Introduce the new path, migrate consumers, then delete the old one — never the reverse, which makes rollback impossible mid-migration.
- **Separate mechanical from semantic changes.** A commit that renames 200 call sites *and* changes behavior in one of them will have that one change reviewed by nobody.
- **Prefer more, smaller steps than the minimum.** Review quality falls off a cliff with diff size; commit count is cheap by comparison.
- **Name what makes each step risky**, not just what it does. "Touches the auth middleware" tells the reviewer where to look.
- **Plan against measured scope, not remembered scope.** Run the search; the usage count is nearly always higher than the person requesting the migration expects.
- **Account for other people's in-flight work.** A step touching a file under active development will conflict — sequence it earlier or later, and say why.

## Limitations

- **Does not execute the migration.** Output is a plan; each step is implemented and reviewed separately.
- **Step sizing is an estimate.** Real diffs come in larger than planned, especially where tests and fixtures shadow the source structure.
- **Cannot find dynamic usages.** Reflection, string-keyed lookups, dependency injection by name, and runtime-constructed imports won't surface in a text search — the plan flags this rather than claiming exhaustive scope.
- **Green tests aren't proof of a safe step.** The plan's verification is only as strong as the repo's existing coverage; where coverage is thin for a step, this is stated as residual risk rather than hidden.
- **Cannot see external consumers.** If the migrated surface is public (a published package, a shared API), downstream breakage is out of view and needs a separate compatibility decision.
- **Assumes a working baseline.** If the build or tests are already failing, the plan starts with fixing that, because no later step can be verified otherwise.
