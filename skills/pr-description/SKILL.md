---
name: pr-description
description: Generates a structured pull request description from the current branch's diff and its linked ticket — what changed, why, and how it was verified. Use when a user asks to write, draft, or update a PR/MR description, not for writing commit messages or code review feedback.
allowed-tools: Read, Bash, Grep, Glob
---

# PR Description

## Purpose

Turn a branch's diff and its linked ticket into a PR description a reviewer can actually use to review faster — what changed, why, what it does *not* cover, and how it was verified. This skill exists so PR descriptions stop being either "fixes bug" or a pasted diff with no narrative, both of which force the reviewer to reconstruct intent themselves.

## When to Use

Use this skill when:

- A user asks to draft, generate, or update a pull/merge request description.
- A branch is ready to open a PR against a base branch (`main`, `develop`, etc.) and needs a description before or after opening it.
- An existing PR description is stale relative to new commits pushed to the branch.

Do **not** use this skill for:

- Writing commit messages (different audience, different granularity — one commit vs. the whole changeset).
- Code review feedback on the diff's correctness — that's the `code-reviewer` agent's job, not this skill's.
- Changelog entries meant for end users — see `changelog-entry` for that framing.

## Inputs

| Input | Required? | Why it matters |
|---|---|---|
| Branch diff (`git diff <base>...HEAD`) | Required | The actual unit being described — never invent changes not in the diff |
| Base branch name | Required | Determines what's "new" in this PR vs. already merged |
| Linked ticket/issue (ID, title, description) | Strongly recommended | Supplies the *why*; without it, intent is inferred from commits/code alone |
| Commit messages on the branch | Recommended | Often contains reasoning not visible in the diff itself |
| Existing PR description (if updating) | Recommended | Preserves reviewer-facing context (e.g. "already discussed in standup") that a diff can't reconstruct |
| Repo's PR template (`.github/PULL_REQUEST_TEMPLATE.md`) | Recommended | Output should fit the repo's existing sections, not invent a new structure |

If no ticket is linked and intent isn't derivable from commit messages, say so and describe only what the diff observably does — don't guess at motivation.

## Instructions

1. **Establish the diff boundary.** Run `git diff <base>...HEAD --stat` to see the full file list, then `git diff <base>...HEAD` for content. If the branch is large, read file-by-file rather than skimming — a summary is only honest if every changed file was actually read.
2. **Pull ticket context, if linked.** Extract the ticket ID from the branch name or commit messages (e.g. `JIRA-123`, `#456`) and read its title/description if available. This becomes the "why."
3. **Detect the repo's PR template.** Check `.github/PULL_REQUEST_TEMPLATE.md`, `.gitlab/merge_request_templates/`, or similar. If one exists, fill its sections rather than replacing them with a generic structure.
4. **Draft the description** with, at minimum:
   - **Summary** — one to three sentences: what changed and why, in plain language a non-author reviewer can follow.
   - **Changes** — a short bulleted breakdown by concern (not by file) when the diff touches more than one area.
   - **How to verify** — what was run (tests, manual repro steps) and what a reviewer can run themselves to confirm it works.
   - **Out of scope / follow-up** — anything visibly related but deliberately not addressed in this PR, so a reviewer doesn't flag it as a gap.
5. **Cross-check against the diff.** Re-read the draft against the actual diff — every claim ("adds validation for X", "removes the unused Y") must correspond to a real hunk. Delete any claim that doesn't.
6. **Report.** Output the description in the repo's template format (or a plain Markdown default if none exists), ready to paste into the PR/MR.

## Best Practices

- **Describe behavior, not implementation trivia.** "Adds retry with exponential backoff for the payment webhook" beats "changes the `retryCount` loop in `webhook.ts`."
- **Never claim verification that didn't happen.** If tests weren't run, say "not run — recommend running `npm test` before merge" instead of implying it passed.
- **Keep it scannable.** A reviewer should get the gist from the summary alone; bullets and headers over paragraphs.
- **Surface risk, don't bury it.** If the diff touches auth, payments, migrations, or a shared utility used elsewhere, call that out explicitly rather than letting the reviewer discover it.
- **Match repo convention.** Use the existing PR template's section names and ordering when one exists, rather than imposing this skill's default structure.

## Limitations

- **Only describes what's in the diff.** It cannot infer intent the diff and ticket don't support — it will say so rather than fabricate a rationale.
- **Doesn't judge correctness.** This skill describes the change; it doesn't review it for bugs — pair with `code-reviewer` for that.
- **Ticket access depends on what's provided.** Without a connected issue tracker, ticket context is limited to what's already visible in the branch name, commits, or user-supplied text.
