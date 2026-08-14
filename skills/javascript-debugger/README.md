# javascript-debugger

A Claude Code skill that diagnoses JavaScript and TypeScript bugs — root cause first, minimal fix second — instead of pattern-matching a plausible-looking patch onto the symptom.

## What it does

Give it a bug report, an error message, or a failing test, and it runs a fixed diagnostic loop:

```
reproduce → localize → hypothesize (name the mechanism) → verify → minimal fix → validate → report
```

It won't jump straight to a fix. If it can't reproduce or verify the bug with what it's given, it says so and marks the fix **unverified** rather than presenting a guess with false confidence.

## Why not just ask Claude to "fix this bug"?

Ad hoc, a model asked to fix a bug will often patch the crash site — add a null check, wrap it in `try/catch`, add a default value — and stop there. That frequently makes the symptom disappear without touching the actual defect, which tends to resurface elsewhere in the codebase later. This skill forces the extra steps (name the mechanism, verify it before touching code, check for the same pattern elsewhere) that separate a real fix from a suppressed symptom.

## Installation

**Project-scoped** (recommended — travels with the repo, reviewable in PRs):

```bash
mkdir -p .claude/skills
cp -r skills/javascript-debugger .claude/skills/
```

**User-scoped** (available in every project):

```bash
cp -r skills/javascript-debugger ~/.claude/skills/
```

## Usage

The skill is description-triggered — Claude Code loads it automatically when a prompt matches a JS/TS debugging scenario. You can also invoke it explicitly:

```
Use the javascript-debugger skill: users report that our live search sometimes
shows results for a previous query after typing a new one. Relevant file:
src/searchBox.ts. No stack trace — it doesn't crash, it just shows stale data.
```

The more of the [Inputs](SKILL.md#inputs) you provide up front — repro steps, error message, environment — the fewer round trips it takes to reach a verified root cause.

## What "good" output looks like

- A **one-sentence root cause** naming the actual mechanism (e.g. "out-of-order async resolution," not "search is broken").
- A **minimal diff**, not a rewrite.
- An explicit **verification statement** — reproduced and confirmed fixed, test suite passed, or static-only/unverified.
- A note on **whether the same bug pattern exists elsewhere** in the codebase.

See [`examples/input.md`](examples/input.md) and [`examples/output.md`](examples/output.md) for a full worked example: a race condition in a debounced TypeScript search box, from bug report to verified fix.

## Requirements

- Claude Code with `Read`, `Grep`, `Glob`, `Bash`, and `Edit` tool access (declared in `SKILL.md`'s `allowed-tools`).
- `Bash` access matters mainly for running an existing test suite or reproduction script — the skill degrades gracefully to static analysis without it, but will say the fix is unverified.

## Files

| File | Purpose |
|---|---|
| `SKILL.md` | The skill definition Claude Code loads: purpose, triggers, inputs, method, best practices, limitations |
| `README.md` | This file — human-facing overview and setup |
| `examples/input.md` | A realistic bug report + source snippet, as you'd hand it to the skill |
| `examples/output.md` | The skill's full diagnosis and fix for that example |

## Scope

This skill debugs. It does not:

- Implement new features (no defect to diagnose).
- Perform security or dependency audits.
- Replace running the code — it verifies with tests/reproductions where possible, but a fix reported as "static-only" should still be run before merging.
