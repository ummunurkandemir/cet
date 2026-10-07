# Expected review: `calculator.js`

The reference output for running the `code-reviewer` agent on [`calculator.js`](calculator.js). It uses the agent's output format (see [`agents/code-reviewer.md`](../../agents/code-reviewer.md#expected-outputs)).

---

## Verdict: REQUEST CHANGES

### Summary
`calculateTotal` sums item prices and formats the result to two decimal places. The loop reads one element past the end of the array, so the function throws a `TypeError` on any non-empty input. It cannot ship as is.

### Findings (ordered by severity)
- [BLOCKING] bug (javascript-debugger) — `calculator.js:4` — The loop condition `i <= items.length` runs one iteration too many. On the last pass `items[items.length]` is `undefined`, and `undefined.price` throws `TypeError: Cannot read properties of undefined (reading 'price')`. Reproduced with `calculateTotal([{ price: 1 }])`. — Change `<=` to `<`.
- [SHOULD-FIX] bug (self) — `calculator.js:8` — `toFixed(2)` returns a string, so callers that treat the total as a number get concatenation instead of addition (`calculateTotal(a) + 5` → `"10.005"`). — If callers need a number, return `Number(total.toFixed(2))`. If the string is intended for display, rename the function or document the return type. Pick whichever matches existing call sites.
- [NOTE] edge case (self) — `calculator.js:5` — Prices are summed as binary floats, so `0.1 + 0.2` style rounding error can build up across many items before the final `toFixed`. Rounding at the end hides this for typical carts, but summing integer cents is safer for money. Not blocking.
- [NOTE] edge case (self) — `calculator.js:1` — `items` of `null`/`undefined` throws, and an item without `price` turns the total into `NaN` (returned as `"NaN"`). Whether to guard depends on what callers guarantee. Flagged so the decision is explicit.

### Areas checked with no findings
Performance (single linear pass), security (no external input reaches a sink), maintainability (small and readable; the module follows the CommonJS export style).

### Out-of-scope observations
`calculator.js` has no trailing newline.
