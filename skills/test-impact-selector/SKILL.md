---
name: test-impact-selector
description: Selects the minimal test subset that actually covers a diff — by tracing imports, call sites, fixtures and config from the changed files — and states explicitly what the selection does not cover. Use to shorten a pre-push or PR feedback loop, not as a replacement for the full suite before merge or release.
allowed-tools: Read, Bash, Grep, Glob
---

# Test Impact Selector

## Purpose

Answer one question cheaply: given this diff, which tests could plausibly fail? A 20-minute suite run on a two-line change trains people to push without running tests at all, which costs far more than the 20 minutes. This skill picks the subset worth running now — and, just as importantly, names what that subset leaves unverified so the shortcut is taken knowingly.

The default posture is conservative: when the impact of a change can't be traced with confidence, the answer is "run everything," not a guess.

## When to Use

Use this skill when:

- A pre-push or pre-commit check needs fast feedback and the full suite is too slow to run per-iteration.
- A developer is iterating on a change and wants the shortest loop that would still catch a break.
- A CI pipeline runs a fast gate before the full suite and needs a defensible subset for that gate.

Do **not** use this skill for:

- The final gate before merge, release, or deploy. Those run the full suite — impact selection is an iteration-speed tool, not a merge criterion.
- Deciding which tests to *delete*. A test not selected for a given diff is not a useless test.
- Writing the missing tests it may reveal — that's the `test-author` agent.
- Diagnosing why a selected test fails — see `javascript-debugger` or `bug-fixer`.

## Inputs

| Input | Required? | Why it matters |
|---|---|---|
| The diff (staged, branch vs. base, or a commit range) | Required | Defines the change set the selection is derived from |
| Test suite layout and the command to run a subset | Required | Selection is useless if the runner can't be invoked with a file/pattern filter |
| Import/dependency graph of the repo | Required | Built by the skill via `Grep`/`Glob`; the primary evidence for which tests reach the changed code |
| Coverage data mapping tests to source lines | Strongly recommended | The most reliable mapping available; import tracing is the fallback, not the ideal |
| Non-source changes in the diff (config, fixtures, schema, CI, lockfile) | Required | These have suite-wide blast radius and usually invalidate any narrow selection |
| Known global/shared state in the test setup | Recommended | Shared fixtures and setup files break the assumption that tests are independently selectable |

## Instructions

1. **Classify every changed file first.** Source, test, fixture, config, schema, build/CI, dependency manifest. Anything outside "source and test" is a signal to widen — a changed lockfile or global config can affect any test in the suite.
2. **Escalate to the full suite immediately** if the diff touches a dependency manifest/lockfile, a global test setup or shared fixture, CI/build configuration, a schema/migration, or environment config. Report the reason rather than producing a narrow selection that looks precise and isn't.
3. **Use coverage data when it exists.** A test-to-line mapping from a recent coverage run answers the question directly; verify it isn't stale relative to the current file structure before trusting it.
4. **Otherwise trace the import graph outward** from each changed source file: direct importers, their importers, and so on, until reaching test files. Include tests that import the changed file transitively, not just directly.
5. **Add the obvious co-located tests** — the sibling `foo.test.ts` / `foo_test.go` / `test_foo.py` for every changed source file, even if the import trace already found them.
6. **Include tests changed by the diff itself.** A modified test always runs.
7. **Widen for known blind spots:** anything reached by dynamic import, dependency injection by name, string-keyed registries, reflection, or a plugin/hook mechanism. These are invisible to a static trace — name them and include the tests around them rather than silently omitting them.
8. **Sanity-check the selection's size.** A selection of 3 tests for a change touching a core utility imported by 200 files is a tracing failure, not a win — re-check the trace or escalate to the full suite.
9. **Report** the selected tests, the runnable command, the reasoning per selection (coverage-mapped, import-traced, co-located, or blast-radius), and — as its own section — what this selection does **not** cover.

## Best Practices

- **Fail wide, not narrow.** The cost of running an extra test file is seconds; the cost of missing the one that would have caught the bug is a revert.
- **State the unverified surface every time.** A selection reported without its blind spots gets treated as a full run within a week.
- **Prefer coverage data over import tracing** where available, and say which one produced the selection — their confidence levels are not the same.
- **Treat config, fixture, and dependency changes as suite-wide.** They are the changes most likely to break something far from where they were edited.
- **Never let selection substitute for the merge gate.** Position it explicitly as the fast loop that runs *before* the full suite, never instead of it.
- **Re-select per diff, don't cache.** A selection is valid for one change set; reusing yesterday's list is how untested paths ship.
- **Report the time saved honestly.** If the subset takes 80% of the full suite's runtime, the answer is "just run everything."

## Limitations

- **Static tracing cannot see dynamic wiring.** Reflection, DI by string name, runtime-registered plugins, and generated code all break the import graph — the skill flags this rather than claiming complete coverage of impact.
- **Coverage data goes stale.** A mapping from an old run misses tests added since, and misattributes lines in files that have moved.
- **Test independence is assumed but not guaranteed.** Suites with shared state or order dependence can pass a subset and fail the full run — a property of the suite, not of the selection.
- **Integration and end-to-end tests resist mapping.** They exercise paths no import graph shows; the safe default is including them for any non-trivial change.
- **Cannot detect behavioral coupling.** Two modules with no import relationship can still depend on each other through a database, a queue, or a shared file.
- **Only as granular as the test runner.** If the runner can't filter below the file or package level, the selection can't either.
