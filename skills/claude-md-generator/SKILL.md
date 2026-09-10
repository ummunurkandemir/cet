---
name: claude-md-generator
description: Generates or updates a repository's CLAUDE.md by reading its actual build files, test setup, directory layout and git history — recording the conventions a newcomer would otherwise learn by getting a PR rejected. Use when onboarding a repo to Claude Code or when an existing CLAUDE.md has drifted from the codebase, not for writing human-facing README or contributor docs.
allowed-tools: Read, Write, Bash, Grep, Glob
---

# CLAUDE.md Generator

## Purpose

Write down what a repository expects, so it doesn't have to be re-explained in every session. A good `CLAUDE.md` is short and load-bearing: the commands that actually work, the conventions that are actually enforced, and the traps that have actually bitten people. This skill produces that from evidence in the repo — not from a generic template with the project name substituted in.

The failure mode it exists to prevent is the 400-line `CLAUDE.md` that restates the directory tree, lists every dependency, and says nothing a model couldn't have inferred by reading one file.

## When to Use

Use this skill when:

- A repository is being onboarded to Claude Code and has no `CLAUDE.md`.
- An existing `CLAUDE.md` has drifted — commands that no longer work, a framework since replaced, conventions the codebase abandoned.
- Repeated corrections in sessions reveal a convention that was never written down anywhere.
- A monorepo package needs its own scoped `CLAUDE.md` distinct from the root one.

Do **not** use this skill for:

- Human-facing documentation — `README.md`, `CONTRIBUTING.md`, and architecture docs serve a different reader with different needs.
- Encoding one person's preferences as repo-wide rules. If it isn't enforced by lint, CI, review, or overwhelming precedent, it isn't a convention.
- Project-specific *task* procedures — those belong in a skill, which loads on demand, rather than in context loaded on every single turn.

## Inputs

| Input | Required? | Why it matters |
|---|---|---|
| Build/package files (`package.json`, `Makefile`, `go.mod`, `pyproject.toml`, etc.) | Required | The source of truth for real commands — scripts, not folklore |
| CI configuration | Required | Reveals what's actually enforced on every PR, which is the strongest definition of "convention" a repo has |
| Directory layout | Required | Establishes where code, tests, and config are expected to live |
| Lint/format/type-check config | Strongly recommended | Rules already machine-enforced should not be restated as prose — the file should point at them |
| Existing tests | Strongly recommended | Show the actual test idiom: framework, layout, fixture and mocking conventions |
| Recent git history | Recommended | Shows live conventions (commit format, branch naming, review norms) rather than aspirational ones |
| Existing `CLAUDE.md`, `README`, `CONTRIBUTING` | Recommended | Avoid duplication; in an update, existing hand-written content is preserved unless proven stale |
| Known traps (flaky setup steps, required env vars, services that must run locally) | Optional | The highest-value content in the file, and the least discoverable from code alone |

## Instructions

1. **Verify the commands, don't just copy them.** Read the scripts, then check that a listed build/test/lint command actually resolves (present in `scripts`, a `Makefile` target, a real binary). A `CLAUDE.md` full of commands that error is worse than none.
2. **Derive conventions from evidence, and cite it.** "Tests live next to source as `*.test.ts`" is a claim; back it by counting the actual layout. State the evidence in the generation report, not in the file itself.
3. **Prefer what CI enforces.** If a rule is checked by a pipeline job, it's a real convention. If it exists only in someone's head, it's a preference — leave it out or mark it explicitly as such.
4. **Don't restate machine-enforced rules.** Formatting governed by Prettier/gofmt/black is settled by running the formatter; a prose paragraph about indentation is context spent for nothing. Point at the config instead.
5. **Capture the non-obvious.** Required env vars, services that must be running, a test suite needing a live database, a generated file that must never be hand-edited, a directory that is vendored. This is the part nobody can infer from reading code.
6. **Record what's deliberately weird.** Every codebase has a pattern that looks wrong and isn't — a workaround, a legacy constraint, a deliberate deviation. Writing down *why* prevents an agent (or a new engineer) from "fixing" it.
7. **Keep it short and prioritized.** Commands first, conventions second, traps third. Anything a model would discover by reading a single file within the first minute does not need to be in a file loaded on every turn.
8. **When updating, verify the existing file line by line** before rewriting. Flag stale claims explicitly and preserve hand-written content that is still true — an update should not silently discard institutional knowledge.
9. **Report** the generated file plus a list of every claim in it and how it was verified, so a maintainer can correct the inferences rather than audit the whole file.

## Best Practices

- **Every line earns its place.** This file is loaded into context on every turn; length has a running cost that a README doesn't.
- **Commands must be copy-pasteable and correct.** Verified against the actual build config, not reconstructed from convention.
- **Write conventions as observable rules**, not aspirations. "New endpoints go in `routes/`" beats "we value clean architecture."
- **Prefer "why" for anything surprising.** A rule without a reason gets discarded the first time it's inconvenient.
- **Scope monorepo files correctly.** Package-specific rules belong in that package's `CLAUDE.md`, not in the root file every session pays for.
- **Mark uncertain inferences as uncertain** rather than asserting them — a confidently wrong convention will be followed until it causes a rejected PR.
- **Never invent a convention to fill a section.** An empty section is honest; a fabricated rule becomes real the moment someone follows it.

## Limitations

- **Infers conventions from code, which can be inconsistent.** Where a codebase does the same thing three ways, the skill reports the split rather than picking a winner — that's a maintainer's call.
- **Cannot know unwritten team norms.** Review expectations, ownership boundaries, and "don't touch that service without asking X" are invisible in the repository.
- **Cannot execute a full build to prove commands work.** It verifies that commands exist and resolve; it does not run a complete build/test cycle unless explicitly asked.
- **Git history reflects the past.** A convention visible in commits from a year ago may already be abandoned.
- **Won't detect what's missing.** If a repo has no documented setup step because everyone already has the env configured, that gap stays invisible.
- **An update is bounded by what's verifiable.** Existing claims that can't be confirmed or refuted from the repo are flagged for human review rather than silently kept or deleted.
