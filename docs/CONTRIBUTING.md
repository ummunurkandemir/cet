# Contributing

Skills, agents and workflows in this repository are engineering artifacts. They get reviewed, validated in CI and backed by a fixture, the same as code. This guide covers what a contribution has to include to be merged.

## Layout

| Artifact | Location | Loaded by Claude Code as |
|---|---|---|
| Skill | `skills/<name>/SKILL.md` (plus optional `README.md`, `examples/`) | A skill, discovered by its `description` |
| Agent | `agents/<name>.md` (one flat file) | A subagent, invoked by name or delegated to |
| Workflow | `workflows/<name>.workflow.js` | A Workflow script (`export const meta` + `agent()`/`phase()`) |
| Hook example | `hooks/` | A `settings.json` snippet you copy into your own config |
| Template | `templates/` | Not loaded; copy it to start a new artifact |

Agents must be flat files. Claude Code doesn't discover `agents/<name>/AGENT.md`.

## Frontmatter

Skill:

```yaml
---
name: my-skill                 # must equal the directory name
description: What it does, and when to use it rather than a sibling. This is the trigger.
allowed-tools: Read, Bash, Grep, Glob
---
```

Agent:

```yaml
---
name: my-agent                 # must equal the file name without .md
description: Role, scope, and when NOT to use it.
tools: Read, Grep, Glob, Bash
model: inherit
---
```

Claude Code decides whether a skill applies by reading its `description`. There's no `trigger:` field, so the description has to say when the skill applies and when a sibling fits better. Hook- or CI-driven triggering is configured separately (see `hooks/`).

## Required sections

- **Skills:** Purpose · When to Use · Inputs · Instructions · Best Practices · Limitations
- **Agents:** Purpose · Responsibilities · Inputs · Expected Outputs · Decision-Making Process · Success Criteria · Failure Conditions · Best Practices · Limitations. Add Skill Integration when the agent delegates to a skill.

Start from the matching file in [`templates/`](../templates/).

## Checklist for a new artifact

- [ ] `name` matches the directory or file name.
- [ ] The `description` states both when to use it and when not to, naming the sibling that fits instead.
- [ ] Tools are an explicit allowlist. `*` / "All tools" is rejected by CI.
- [ ] Read-only artifacts don't list `Edit`/`Write`.
- [ ] At least one fixture or worked example exists under `examples/` (repo-level or inside the skill directory).
- [ ] A row in the matching README table links to the file.
- [ ] `npm run validate` passes.

## Best practices

- **Name after the outcome, not the mechanism.** `flaky-test-triage`, not `rerun-tests-script`.
- **Keep scope narrow.** A skill that "reviews, fixes and documents" is three skills.
- **Fail closed.** A step that can't decide pass/fail should stop and say so, not continue.
- **Report evidence, not confidence.** Separate "ran and confirmed" from "read and inferred".
- **Delegate instead of duplicating.** If a skill already owns a diagnosis, such as `javascript-debugger`, call it rather than re-deriving it.

## Pull requests

1. Branch from `main`.
2. Add or change the artifact, its fixture and its README row.
3. Run `npm run validate`.
4. In the PR, describe the trigger condition, the expected behavior and the real-world case that motivated it.
