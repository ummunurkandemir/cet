---
name: commit-splitter
description: Splits an oversized working tree into a sequence of coherent, individually reviewable commits — grouping hunks by intent, ordering them so each commit builds and passes tests, and proposing the plan for approval before committing anything. Use when uncommitted changes have grown to mix several concerns, not for planning a future refactor (see migration-planner for that) or rewriting already-pushed history.
allowed-tools: Read, Bash, Grep, Glob
---

# Commit Splitter

## Purpose

Turn "I've been working for two days and the diff touches 40 files" into a short series of commits a reviewer can follow, with one reason to exist per commit. Big mixed commits hide bugs in plain sight: the rename buries the logic change, the formatting pass buries the rename, and `git bisect` later lands on a commit that does five things. This skill does the split while the author still remembers why each hunk exists.

Nothing is committed until the author approves the proposed plan.

## When to Use

Use this skill when:

- The working tree (staged and unstaged) mixes unrelated concerns: a feature, a refactor it needed, a drive-by fix, a dependency bump, formatting.
- A reviewer asked for a PR to be split, and the changes aren't committed yet or exist only as local, unpushed commits.
- One local WIP commit has to be broken apart before pushing.

Do **not** use this skill for:

- Planning a large migration that hasn't been written yet. That's `migration-planner`.
- Rewriting history that's already pushed to a shared branch. Changing published commits is a team decision, not a cleanup step.
- A diff that is already one coherent change, however large. Size alone isn't a reason to split. Mixed intent is.

## Inputs

| Input | Required? | Why it matters |
|---|---|---|
| The working tree (`git status`, `git diff`, `git diff --staged`) | Required | The material being split |
| The repo's build and test commands | Required | Each proposed commit has to be shown to build and pass on its own |
| The author's stated intent (ticket, PR description, or a sentence) | Recommended | Tells a deliberate change apart from an accident that should be dropped |
| Commit message conventions (`CLAUDE.md`, recent `git log`) | Recommended | Messages match the repo's format, e.g. Conventional Commits or ticket prefixes |

## Instructions

1. **Snapshot first.** Record `git stash create` (or the current `HEAD` plus a patch of the working tree) and report the reference, so the original state can be restored exactly whatever happens next.
2. **Inventory every hunk.** Use `git diff -U0` and `git status --porcelain`, including untracked files. Don't silently leave any change out of the plan.
3. **Classify each hunk by intent:** feature/behavior change, refactor (behavior-preserving), bug fix, test, dependency/config, formatting, generated file. When one hunk mixes intents, note that it has to be split at line level.
4. **Group hunks into commits, one intent each.** Generated files go with whatever generated them. Tests go with the behavior they cover.
5. **Order the commits so every prefix is green:** dependency/config, then pure refactors, then fixes, then features, then formatting. A refactor that the feature depends on comes first. If the order creates a commit that can't build without a later one, merge those two rather than shipping a broken intermediate commit.
6. **Propose the plan and stop.** For each commit give the message, the files/hunks it contains, and one line on why it stands alone. Wait for the author to approve or edit it.
7. **On approval, build each commit in order.** Stage exactly its hunks with `git add -p` / `git apply --cached` from a hunk patch, never `git add -A`. Run the build and the fast tests. Commit only if they pass. If a commit fails, stop, report which hunk is missing or misplaced, and don't continue past a red commit.
8. **Verify nothing was lost.** After the last commit, `git diff <snapshot>` must be empty: the commits together reproduce the original tree exactly. Report the final `git log --oneline` for the range.

## Best Practices

- **One reason per commit.** If the message needs "and", it's probably two commits.
- **Refactors before behavior changes.** A reviewer can skim a behavior-preserving rename and spend their attention on the commit that changes behavior.
- **Never mix formatting with logic.** Put a formatter run in its own commit, ideally first, so later diffs show only real changes.
- **Keep tests with the change they prove.** A "tests" commit at the end leaves every earlier commit unverified.
- **Prefer fewer, honest commits over many artificial ones.** Splitting tangled code into commits that don't build individually is worse than one larger commit.
- **Write messages from intent, not from the diff.** "Extract retry policy so checkout can reuse it", not "move code to retry.ts".

## Limitations

- **Can't split what's semantically entangled.** When a refactor and a behavior change are in the same lines, the split may need a hand edit. The skill points to those lines instead of guessing.
- **"Green" is only as good as the fast test suite.** Each intermediate commit is checked with the build and the fast tests, not the full suite. The report says so.
- **Doesn't touch pushed history.** For commits that are already published, it only proposes the split and leaves rewriting to the team.
- **Needs the author's intent for ambiguous hunks.** A debug log or a commented-out block might be deliberate. The skill asks about each one instead of dropping it.
