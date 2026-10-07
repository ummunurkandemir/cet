# Example: buggy-javascript

A ten-line fixture for checking that the [`code-reviewer`](../../agents/code-reviewer.md) agent, and through it the [`javascript-debugger`](../../skills/javascript-debugger/SKILL.md) skill, catches a real bug rather than commenting on style.

## The scenario

[`calculator.js`](calculator.js) exports `calculateTotal(items)`, which sums `items[i].price` and returns the total to two decimal places. It looks fine at a glance, but it throws on every non-empty call.

## Running it

From a Claude Code session in this repository, with the toolkit installed (see the root [README](../../README.md#-getting-started)):

```
Use the code-reviewer agent to review examples/buggy-javascript/calculator.js
```

Then compare the agent's output with [`expected-review.md`](expected-review.md).

## What counts as a pass

- The verdict is `REQUEST CHANGES`.
- The off-by-one loop bound (`i <= items.length`) is reported as **BLOCKING**, with the fix `i < items.length`.
- The string return type from `toFixed` is reported (SHOULD-FIX or NOTE).
- The reviewer doesn't propose rewriting the function, for example as `reduce`, when a one-character fix will do.

Exact wording will vary between runs. Grade on the findings, their severity and the proposed fixes, not on the prose.

## Confirming the bug yourself

```bash
node -e "console.log(require('./examples/buggy-javascript/calculator').calculateTotal([{ price: 1 }]))"
# TypeError: Cannot read properties of undefined (reading 'price')
```
