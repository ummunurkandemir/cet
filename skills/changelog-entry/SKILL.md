---
name: changelog-entry
description: Drafts a CHANGELOG.md entry in Keep a Changelog format from a merged change — the category, the user-visible effect, and the migration note when one is needed. Use when adding an entry for a change that just landed, not for composing full release notes for end users (see release-notes-writer agent for that).
allowed-tools: Read, Edit, Bash, Grep, Glob
---

# Changelog Entry

## Purpose

Turn a landed change into a single, correctly categorized `CHANGELOG.md` line that a maintainer reading it six months later can still act on. This skill exists because changelogs decay in a predictable way: entries get written from the commit subject ("fix bug"), land in the wrong category, and omit the one thing a reader needs — whether they have to do anything.

## When to Use

Use this skill when:

- A change has been merged (or is about to be) and the repo keeps a `CHANGELOG.md`.
- A release is being cut and the `Unreleased` section needs to be reviewed, deduplicated, or promoted to a version heading.
- An existing entry is wrong — miscategorized, missing a breaking-change note, or written in implementation terms.

Do **not** use this skill for:

- User-facing release notes across a whole version — that's `release-notes-writer`'s job. This skill writes engineer-facing entries, one change at a time.
- Writing the PR description for the change — see the `pr-description` skill.
- Deciding the next version number. This skill reports whether a change is breaking; the release process owns the version bump.

## Inputs

| Input | Required? | Why it matters |
|---|---|---|
| The change itself (diff, merge commit, or PR) | Required | The entry is derived from what actually changed, not from the commit subject line |
| Existing `CHANGELOG.md` | Required | Establishes the repo's format, category names, and entry style — match it rather than importing a generic one |
| PR description / linked ticket | Recommended | Supplies user-visible intent that the diff alone doesn't state |
| Public API surface (exported symbols, CLI flags, config keys, HTTP routes) | Recommended | Determines whether the change is breaking and therefore which category it belongs in |
| Release/versioning policy (`docs/`, `CONTRIBUTING.md`) | Optional | Some repos add custom categories or require a ticket reference per entry |

## Instructions

1. **Read the existing `CHANGELOG.md` first** and match its conventions — heading style, category names, whether entries link to PRs, tense, and capitalization. A correct entry in the wrong house style still requires a follow-up edit.
2. **Read the actual change**, not just its subject line. Use `Bash` (`git show`, `git diff`) and `Read` to establish what a consumer of this project observes differently after the change.
3. **Classify it into exactly one Keep a Changelog category:** `Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, or `Security`. If a change genuinely spans two (e.g. a new flag replacing an old one), write two entries rather than one blurred entry.
4. **Determine whether it is breaking.** Check for removed/renamed exports, changed function signatures, altered default behavior, config keys, CLI flags, response shapes, and database schema. Breaking changes are marked explicitly, per the repo's convention.
5. **Write the entry from the consumer's point of view** — what changed for someone using the project, in one sentence. Internal refactors with no observable effect usually do not belong in the changelog at all; say so rather than padding the file.
6. **Add a migration note when action is required**, naming the concrete before/after (old call → new call, old flag → new flag). "This is a breaking change" without the migration is a bug report, not a changelog entry.
7. **Place it under `Unreleased`** in the correct category, creating the category heading only if it doesn't exist, and check the section for an existing entry covering the same change before adding a duplicate.
8. **Report what was added**, including the category chosen and the reasoning if the classification was ambiguous.

## Best Practices

- **Write the effect, not the implementation.** "Fixed a crash when importing a CSV with no header row" beats "Fixed null check in `parseHeader`."
- **One change, one entry.** A single entry describing three things will be read as one thing and searched for as none.
- **Never invent a ticket or PR reference.** If the repo's format requires one and it isn't available, leave the placeholder and flag it rather than guessing a number.
- **Prefer omitting an entry to writing a meaningless one.** Pure refactors, test-only changes, and formatting passes don't belong in a consumer-facing changelog unless the repo's policy says otherwise.
- **Deprecations name the replacement and the removal version** where policy defines one — a deprecation with no path forward gets ignored until it breaks.
- **Say when a change is breaking even if the author didn't.** Authors routinely underestimate this; check the API surface rather than trusting the PR title.

## Limitations

- **Cannot know the release date or next version number** — entries go under `Unreleased` unless the version is explicitly supplied.
- **Breaking-change detection is bounded by visible surface.** Behavior consumed via reflection, dynamic dispatch, string-keyed config, or downstream monkey-patching may break without appearing in the diff.
- **Cannot see downstream consumers.** Whether a technically breaking change actually breaks anyone is a judgment this skill flags but can't confirm.
- **Assumes Keep a Changelog structure.** For repos using a generated changelog (`semantic-release`, `changesets`, `git-cliff`), the entry belongs in that tool's input format — this skill reports the mismatch instead of hand-editing a generated file.
