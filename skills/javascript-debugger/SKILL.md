---
name: javascript-debugger
description: Diagnoses JavaScript and TypeScript bugs from a symptom, error message, or failing test — finds the root cause and proposes the smallest correct fix. Use when a user reports a crash, wrong output, race condition, memory leak, or unexpected `undefined`/`NaN` in JS/TS/Node/browser code, rather than for greenfield feature work.
allowed-tools: Read, Grep, Glob, Bash, Edit
---

# JavaScript Debugger

## Purpose

Turn a vague bug report ("search results are wrong sometimes", "this throws in prod but not locally") into a **verified root cause** and a **minimal, tested fix** — not a guess, and not a rewrite. This skill encodes a repeatable diagnostic method so debugging quality doesn't depend on which engineer (or which session) is doing it.

## When to Use

Use this skill when:

- A JS/TS function, component, or service produces wrong output, throws, or hangs.
- There's a stack trace, failing test, or reproducible symptom to investigate.
- The bug is intermittent — race conditions, stale closures, event-ordering issues, timing-dependent state.
- Someone asks "why does this happen" before asking "can you fix it."

Do **not** use this skill for:

- Implementing new features or endpoints (no existing bug to diagnose).
- Broad refactors or style cleanup — use a linting/simplification skill instead.
- Pure type errors already caught and explained by `tsc` — just fix those directly, no investigation needed.

## Inputs

Collect as many of these as are available before starting. Missing inputs are not blockers, but each one narrows the search:

| Input | Required? | Why it matters |
|---|---|---|
| Bug description (expected vs. actual behavior) | Required | Defines what "fixed" means |
| Steps to reproduce | Strongly recommended | Turns guessing into verification |
| Error message / stack trace | If it crashed | Points at the failing frame directly |
| Relevant source file(s) or snippet | Required | The skill reads code, it doesn't invent it |
| Failing test (if one exists) | Recommended | Gives a pass/fail oracle for the fix |
| Environment (Node version, browser, framework, runtime flags) | Recommended | Some bugs are environment-specific (event loop timing, module resolution, engine quirks) |
| Recent related changes (`git log`/`git blame` on the file) | Optional | Bugs introduced by a recent diff are usually easiest to find this way |

If the description and the code are inconsistent with each other, say so before proceeding — don't silently pick one.

## Instructions

Follow this loop. Do not skip to step 5.

1. **Reproduce.**
   Confirm the bug actually happens as described. If a failing test exists, run it (`Bash`) and read the failure output. If not, and reproduction is feasible from the given inputs, write the smallest possible reproduction (a script, a one-off test, or a REPL-style snippet) rather than reasoning from the diff alone. If reproduction genuinely isn't feasible with what's provided, say so explicitly and continue with static analysis, flagging the fix as **unverified**.

2. **Localize.**
   Use the stack trace, error message, or symptom to find the exact file/function/line. If there's no stack trace, use `Grep`/`Glob` to find the code path that produces the observed value, then narrow with `git blame`/`git log -p` on the suspect region to see if a recent change introduced it.

3. **Form a hypothesis — name the mechanism, not just the location.**
   "It's broken in `onInput`" is not a hypothesis. "The response for an earlier keystroke resolves after a later one and overwrites it because nothing checks request order" is. Check the bug against these common JS/TS failure classes before settling on one:
   - **Async race / out-of-order resolution** — two promises started in sequence resolve out of order.
   - **Stale closure** — a callback captures a variable from a previous render/iteration (`var` in a loop, a `useEffect` with a stale dependency, an event handler bound before state updated).
   - **Mutation vs. copy** — an array/object is mutated in place when the caller expected an immutable value (shared references, `.sort()`/`.push()` on a prop).
   - **`this` binding** — a method passed as a callback loses its receiver (unbound class method, arrow vs. `function`).
   - **Type coercion** — `==`, implicit `toString()`/`valueOf()`, falsy-but-valid values (`0`, `""`) treated as absent.
   - **Off-by-one / boundary** — loop bounds, array slicing, pagination cursors.
   - **Unhandled rejection / missing `await`** — a promise's rejection (or value) is silently dropped.
   - **Event loop / timing** — `setTimeout`/`Promise` microtask ordering assumptions that don't hold under load.

4. **Verify the hypothesis before touching code.**
   Add a `console.log`/assertion/breakpoint-equivalent, or extend the reproduction, to confirm the mechanism — not just that the bug exists, but *why*. If the hypothesis doesn't hold up, go back to step 3. Never propose a fix for a mechanism you haven't confirmed.

5. **Propose the minimal fix.**
   Fix the mechanism, not the symptom. Prefer the smallest diff that makes the root cause impossible to hit again — not a broader rewrite, not a defensive `try/catch` that swallows the error, not a `?.`/`|| default` that hides a value that shouldn't be missing in the first place. If the true fix is larger than "minimal," say so and explain why, rather than forcing a band-aid to stay small.

6. **Validate.**
   Re-run the reproduction/test and confirm it now passes. Run the surrounding test suite (`Bash`) to check for regressions. `Grep` the codebase for the same buggy pattern elsewhere (e.g., the same unguarded async call duplicated in a sibling component) and flag other occurrences even if you don't fix them all in this pass.

7. **Report.**
   State the root cause in one sentence, show the fix as a diff, state how it was verified (test passed / manually reproduced and re-checked / static-only), and name any residual risk or follow-up.

## Best Practices

- **Minimal diff over rewrite.** A three-line fix a reviewer can verify in ten seconds beats a restructured module that also happens to fix the bug.
- **Fix the cause, not the crash site.** A `null` check at the crash site is often correct there but wrong as the *only* fix — trace back to where the invalid value originated.
- **Add or extend a regression test.** A bug fixed without a test that would have caught it is a bug that will come back.
- **Never silently swallow an error.** No empty `catch {}`, no `.catch(() => {})` added just to stop a crash — that turns a visible bug into an invisible one.
- **Preserve existing style and structure.** Match the file's conventions (module system, error handling style, naming) — this is a fix, not a style pass.
- **State uncertainty.** If reproduction wasn't possible, or the fix is best-effort from static reading, say so plainly instead of presenting it with false confidence.
- **Check for the same bug elsewhere.** Root causes rooted in a shared utility or a copy-pasted pattern usually aren't unique to the one file reported.

## Limitations

- **Needs a real signal to work from.** Without a reproduction, error message, or a concrete description of wrong behavior, this skill can only offer speculative review — it will say so rather than guess.
- **Can't observe runtime state it wasn't given.** Production-only bugs (specific user data, load-dependent timing, a third-party API's real response shape) may not reproduce locally; the skill will say when a fix is unverified for that reason.
- **Flaky/non-deterministic bugs may need multiple runs.** A race condition that reproduces 1-in-20 runs isn't confirmed fixed by one clean run — the skill will say so and recommend repeated verification (or a stress-test loop) before closing it out.
- **Not a security or dependency audit.** It fixes the bug in front of it; it doesn't scan for vulnerabilities or outdated packages (see a dedicated audit skill for that).
- **Browser/engine-specific quirks need the right environment.** A bug tied to a specific browser engine or Node version can't be confirmed fixed by static reading alone — it needs to run there.
