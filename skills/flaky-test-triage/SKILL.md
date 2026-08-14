---
name: flaky-test-triage
description: Reruns a failing test N times to classify it as flaky or a real failure, then diagnoses the mechanism behind genuine flakiness (timing, ordering, shared state, external dependency). Use when a CI failure looks suspicious — passes on rerun, fails only in CI, or fails intermittently — not for a test that fails consistently and reproducibly.
allowed-tools: Read, Bash, Grep, Glob
---

# Flaky Test Triage

## Purpose

Answer the question CI failures leave open: is this test lying (flaky) or telling the truth (a real regression)? Rerunning until it passes and moving on hides real bugs; treating every intermittent failure as "just flaky" and skipping it hides them too. This skill forces a verified classification before either path is taken.

## When to Use

Use this skill when:

- A CI run fails on a test that passed on a previous, unchanged run of the same commit.
- A test fails locally but not in CI, or vice versa.
- A failure report includes phrases like "sometimes fails," "fails only under load," or "reran and it passed."
- Someone wants to know whether it's safe to retry-and-merge or whether the failure needs investigation first.

Do **not** use this skill for:

- A test that fails consistently, every run, same way — that's a real, reproducible failure; go straight to root-causing it (see `javascript-debugger` for JS/TS logic bugs).
- Tests that have never passed (broken from the start) — that's a authoring bug, not flakiness.
- Deciding whether to delete or skip a test long-term — this skill classifies and diagnoses; the decision to quarantine is a judgment call for the author/team.

## Inputs

| Input | Required? | Why it matters |
|---|---|---|
| The specific failing test (name, file, command to run it) | Required | Defines the unit under investigation |
| Failure output/stack trace from the CI run | Required | Shows what actually happened, not just that it happened |
| Number of rerun attempts to use for classification | Recommended (default: 20) | Too few reruns can't distinguish rare flakiness from a real bug that happens to pass once |
| Whether the test passes in isolation vs. full suite | Recommended | Distinguishes shared-state/ordering bugs from timing-only ones |
| Recent changes to the test or code under test (`git log`) | Optional | A newly-flaky test often correlates with a recent change to timing, mocks, or shared fixtures |
| CI environment differences from local (parallelism, resource limits) | Optional | Many flakes are load/timing-dependent and won't reproduce on a quiet local machine |

## Instructions

1. **Isolate and rerun.** Run the specific failing test alone, N times in a row (default 20, more for rare flakes), via `Bash`. Record the pass/fail count. A test that fails 0/20 in isolation but failed once in CI needs step 2 before being called flaky — it may be a suite-ordering or shared-state issue that only appears alongside other tests.
2. **Rerun within the full suite**, if isolation alone passed clean, to check for cross-test interference (shared fixtures, unclosed resources, global state, execution order dependencies).
3. **Classify based on the rerun data:**
   - **Consistent failure** (fails every time, isolated or not) → not flaky. Stop this skill and root-cause it as a real bug.
   - **Passes isolated, fails in full suite** → order/state dependency. Diagnose which other test(s) it collides with.
   - **Intermittent even in isolation** → timing/environment flakiness. Diagnose the mechanism (step 4).
   - **Never fails on rerun (0 failures across N runs) but failed once in CI** → likely environment-specific (CI resource contention, parallelism); note this explicitly as unresolved rather than declaring it flaky on local evidence alone.
4. **Diagnose the mechanism for genuine flakiness** — name it, don't just label it "flaky":
   - **Race condition** — assertion runs before an async operation resolves; missing `await`/`waitFor`.
   - **Shared/leaked state** — a previous test left global state, a DB row, a mock, or a singleton dirty.
   - **Time-of-day/clock dependency** — `Date.now()`, timezone, or date-boundary assumptions.
   - **Resource contention** — port conflicts, file locks, rate limits under parallel execution.
   - **External dependency** — network call, third-party API, or non-deterministic ordering (`Object.keys`, unstable sort) not properly mocked/controlled.
5. **Report the classification and mechanism**, with the rerun pass/fail count as evidence. Do not propose a fix as part of this skill unless explicitly asked — triage's job is diagnosis, not remediation, though naming the mechanism should make the fix obvious to whoever picks it up next.

## Best Practices

- **Never classify from a single rerun.** One pass after one fail is not evidence of flakiness — it's a coin flip. Use enough reruns that the classification is statistically meaningful for the failure's actual rate.
- **Isolation first, then full-suite.** Conflating "fails alone" with "fails only with others" leads to fixing the wrong thing.
- **Name the mechanism, not just the verdict.** "It's flaky" without a mechanism gets the test wrapped in a retry decorator and the real bug (often a genuine race in production code, not just the test) stays hidden.
- **Don't auto-quarantine.** Recommend it if warranted, but flag for human judgment — some "flaky" tests are flaky because they're correctly catching a real intermittent bug in the code under test.
- **Preserve the failure evidence.** Save the original CI failure output alongside the rerun results so a reviewer can compare, rather than trusting a summary.

## Limitations

- **CI-only flakiness may not reproduce locally.** Resource contention, parallelism, and container limits differ; the skill will say when a classification rests only on local reruns and flag it as provisional.
- **Rerun count is a statistical judgment, not proof.** A 1-in-100 flake can still show 0/20 clean reruns; report the sample size alongside the verdict so its confidence is legible.
- **Does not fix the underlying issue.** It classifies and diagnoses the mechanism; applying a fix (adding a wait, isolating state, mocking a dependency) is a separate step.
- **Cannot distinguish "flaky test" from "test correctly catching a real intermittent production bug"** without deeper investigation — it will flag this possibility rather than assume the test itself is always at fault.
