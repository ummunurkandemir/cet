# Claude Engineering Toolkit

> Production-ready Skills, Agents, Workflows, Templates, and Examples for teams building with Claude Code.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Contributions Welcome](https://img.shields.io/badge/contributions-welcome-brightgreen.svg)](#-contributing)

## 🚀 Project Overview

**Claude Engineering Toolkit** is a curated, versioned collection of reusable building blocks for [Claude Code](https://claude.com/claude-code): Skills that encode repeatable procedures, Agents that specialize in narrow tasks, Workflows that chain them into deterministic pipelines, and Templates that scaffold new ones in minutes. Everything here has been run against real codebases — not written once and left to bit-rot in a gist.

The goal is simple: stop re-teaching Claude the same conventions in every repo, and give engineers a shared, testable vocabulary for AI-assisted development.

## 💡 Why This Repository Exists

Teams adopting Claude Code independently converge on the same prompts — a bug-triage flow, a PR review checklist, a test-coverage gate — each slightly different, none reviewed, all undocumented. That duplication costs more than it saves:

- **Tribal knowledge trapped in one engineer's prompt history**, gone when they leave.
- **No review process for AI instructions**, though a bad prompt can produce worse code than no automation at all.
- **Reinventing scaffolding** — every new skill starts from a blank `SKILL.md` instead of a proven template.

This repo treats prompts, agent definitions, and workflows as **engineering artifacts**: versioned, reviewed, tested against fixtures, and documented well enough for someone outside the original author's head to maintain.

## ✨ Features

| Capability | Description |
|---|---|
| **Composable Skills** | Self-contained `SKILL.md` procedures with clear trigger conditions, no hidden state |
| **Specialized Agents** | Narrow-scope subagents with explicit tool allowlists, safe to run unattended |
| **Deterministic Workflows** | Multi-step pipelines with hard gates (lint → test → review) instead of freeform chaining |
| **Ready-to-fork Templates** | Boilerplate for skills, agents, and workflows with frontmatter already correct |
| **Fixture-based Examples** | Runnable end-to-end scenarios you can execute against sample repos before adopting |
| **CI-friendly** | Templates assume non-interactive execution and machine-readable output by default |

## 🗂️ Repository Structure

```
claude-engineering-toolkit/
├── skills/                  # SKILL.md procedures, one directory per skill
│   ├── pr-description/
│   ├── dependency-audit/
│   └── flaky-test-triage/
├── agents/                  # Subagent definitions (.md with frontmatter)
│   ├── bug-fixer.md
│   ├── code-reviewer.md
│   └── release-notes-writer.md
├── workflows/                 # Multi-step pipelines (workflow.js / .yaml)
│   ├── ship-it.workflow.js
│   └── incident-triage.workflow.js
├── templates/                # Starter scaffolds for new artifacts
│   ├── skill-template/
│   ├── agent-template.md
│   └── workflow-template.js
├── examples/                  # Runnable, fixture-backed demos
│   ├── legacy-migration/
│   └── onboarding-new-service/
├── docs/                     # Conventions, style guide, versioning policy
└── README.md
```

**Request flow** — how a piece typically gets invoked in practice:

```
   developer
       │
       ▼
 ┌─────────────┐      matches trigger      ┌───────────────┐
 │ Claude Code │ ───────────────────────▶  │     Skill      │
 │  (session)  │                           │  (procedure)   │
 └─────────────┘                           └───────┬────────┘
       │                                            │ delegates
       │ orchestrates                               ▼
       ▼                                    ┌────────────────┐
 ┌─────────────┐                            │     Agent       │
 │  Workflow   │ ◀───────────────────────── │ (scoped worker) │
 │  (pipeline) │        reports back        └────────────────┘
 └──────┬──────┘
        ▼
   PR / commit / report
```

## 🧠 Available Skills

| Skill | Purpose | Trigger | Status |
|---|---|---|---|
| [`javascript-debugger`](skills/javascript-debugger/SKILL.md) | Diagnoses JS/TS bugs from a symptom or failing test, finds the root cause, proposes the minimal fix | Manual, or delegated to by `code-reviewer`/`bug-fixer` | ✅ Available |
| [`pr-description`](skills/pr-description/SKILL.md) | Generates a structured PR description from the diff and linked ticket | Manual (`/pr-description`) | ✅ Available |
| [`dependency-audit`](skills/dependency-audit/SKILL.md) | Flags outdated or vulnerable dependencies before merge | Pre-push hook | ✅ Available |
| [`flaky-test-triage`](skills/flaky-test-triage/SKILL.md) | Reruns failing tests N times, classifies flaky vs. real failures | CI failure webhook | ✅ Available |
| `changelog-entry` | Drafts a CHANGELOG.md entry matching Keep a Changelog format | Manual or pipeline step | 🚧 Planned |
| `migration-planner` | Breaks a large refactor into reviewable, sequenced commits | Manual (`/migration-planner`) | 🚧 Planned |

Example invocation:

```bash
# Inside a Claude Code session
/pr-description --base main
```

## 🤖 Available Agents

| Agent | Role | Tools | Status |
|---|---|---|---|
| [`bug-fixer`](agents/bug-fixer/AGENT.md) | Root-causes a failing test or error report and proposes a minimal fix | Read, Edit, Bash | ✅ Available |
| [`code-reviewer`](agents/code-reviewer/AGENT.md) | Independent second opinion on a diff; flags correctness and convention drift | Read, Grep, Glob, Bash | ✅ Available |
| [`release-notes-writer`](agents/release-notes-writer/AGENT.md) | Summarizes merged PRs since last tag into user-facing notes | Read, Bash | ✅ Available |
| `dependency-upgrader` | Bumps a single dependency, runs the test suite, reverts on failure | Read, Edit, Bash | 🚧 Planned |

Agents are deliberately narrow — each ships with an explicit tool allowlist in its frontmatter so it can be trusted to run with minimal supervision.

## 🔁 Available Workflows

| Workflow | Stages | Use case |
|---|---|---|
| `ship-it` | Lint → Build → Test → Review → Commit → PR | Standard feature branch, gated all the way to an open PR |
| `incident-triage` | Reproduce → Root-cause → Patch → Verify → Postmortem draft | Sentry/PagerDuty-triggered hotfix |
| `dependency-rotation` | Audit → Upgrade → Test → Changelog → PR | Scheduled dependency maintenance |

```
ship-it.workflow.js
┌───────┐   ┌───────┐   ┌──────┐   ┌────────┐   ┌────────┐   ┌────┐
│ Lint  │──▶│ Build │──▶│ Test │──▶│ Review │──▶│ Commit │──▶│ PR │
└───────┘   └───────┘   └──────┘   └────────┘   └────────┘   └────┘
   fails at any stage → pipeline halts, no partial commit
```

## 📄 Templates

| Template | Scaffolds | Notes |
|---|---|---|
| `skill-template/` | A new skill directory with `SKILL.md` + example fixtures | Fill in `trigger` and `steps` |
| `agent-template.md` | A new subagent with frontmatter pre-filled | Requires explicit `tools:` list |
| `workflow-template.js` | A new gated pipeline definition | Stages default to fail-closed |

```yaml
---
name: my-new-skill
description: One-line summary of when this skill fires
trigger: manual   # manual | pre-commit | pre-push | ci-webhook
---
```

## 🧪 Example Use Cases

- **Onboarding a new service** — `examples/onboarding-new-service` reads a service's `go.mod`/`package.json` and generates a starter `CLAUDE.md`.
- **Legacy migration** — `examples/legacy-migration` walks a Vue 2 component through `migration-planner` to split a 1,200-line file into reviewable chunks.
- **Automated hotfix** — `incident-triage` reproduces a Sentry error, drafts a patch via `bug-fixer`, and stops for approval before commit.
- **Dependency hygiene** — `dependency-rotation` upgrades one package per run on a weekly cron, opening a PR only if tests stay green.

## ⚡ Getting Started

```bash
git clone https://github.com/your-org/claude-engineering-toolkit.git
cd claude-engineering-toolkit

# Install a skill or agent into your global Claude Code config
cp -r skills/pr-description ~/.claude/skills/
cp agents/bug-fixer.md ~/.claude/agents/

# Or scope it to a single repo instead of globally
cp -r skills/pr-description /path/to/your-repo/.claude/skills/
```

The skill then becomes available via its trigger (e.g. `/pr-description`) or fires automatically if it's hook-based.

## ✅ Best Practices

- **Name skills after the outcome, not the mechanism** — `flaky-test-triage`, not `rerun-tests-script`.
- **Give every agent an explicit tool allowlist.** `Tools: All tools` is a debugging convenience, not something to ship.
- **Keep workflows fail-closed** — a stage that can't determine pass/fail should block, not skip.
- **Version fixtures alongside the skill.** One without a runnable example is one nobody will trust enough to adopt.
- **Document the trigger precisely.** Vague triggers ("when relevant") fire unpredictably or not at all.

## 🗺️ Roadmap

- [ ] Skill/agent test harness (`toolkit test <name>`) for CI validation
- [ ] Versioned skill registry with semver and changelogs per skill
- [ ] Multi-language template set (current templates assume a Node/Go-style repo)
- [ ] Workflow visual debugger for step-by-step replay
- [ ] Community skill submission template + review checklist

## 🤝 Contributing

Contributions are welcome — new skills, agent refinements, and workflow fixes alike.

1. Fork the repo and branch from `main`.
2. Add your skill/agent/workflow under the matching directory, following the closest existing template.
3. Include at least one fixture demonstrating it works end-to-end.
4. Open a PR describing the trigger condition and expected behavior, with the real-world case that motivated it.

See `docs/CONTRIBUTING.md` for the full style guide.

## 📜 License

Released under the [MIT License](LICENSE).
