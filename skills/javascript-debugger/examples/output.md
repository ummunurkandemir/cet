# Example Output

This is the `javascript-debugger` skill's response to [`examples/input.md`](input.md).

---

## 1. Reproduce

The debounce itself isn't the issue — that was already ruled out (one call per settled query). The symptom ("correct results flash, then get overwritten by stale ones") plus "started after adding debounce" points at what the debounce *didn't* fix: overlapping in-flight requests, not overlapping keystrokes.

Reproduction, simulating variable network latency:

```ts
// repro.ts — simulate two in-flight requests with reversed latency
const responseFor = (query: string, delayMs: number) =>
  new Promise<string[]>((resolve) =>
    setTimeout(() => resolve([`${query}-result`]), delayMs)
  );

async function onInput(query: string, delayMs: number) {
  const results = await responseFor(query, delayMs);
  console.log('rendering:', results);
}

// "lap" is typed first but its response is slow (400ms, simulating load).
// The user pauses just long enough for the debounce to fire on "lap",
// then quickly retypes "phone", whose request is fast (100ms).
onInput('lap', 400);
onInput('phone', 100);

// Output:
// rendering: [ 'phone-result' ]   (100ms)
// rendering: [ 'lap-result' ]     (400ms)  <-- overwrites the correct result
```

Confirmed: this reproduces the reported symptom exactly — a later, faster response renders correctly, then an earlier, slower response arrives after it and overwrites the DOM.

## 2. Localize

`src/searchBox.ts`, `onInput` — specifically the `await fetchResults(query)` → `renderResults(results)` sequence has no check for whether `query` is still the current query by the time the response arrives.

## 3. Hypothesis

**Mechanism: async race / out-of-order resolution.** The debounce controls how often a request is *sent*, but does nothing about the order in which responses *arrive*. Two requests can be in flight at once (one from before a pause, one after), and under variable latency, the older request's response can resolve after the newer one's. `renderResults` has no concept of "is this response still relevant" — it renders whatever arrives, last-write-wins by arrival time rather than by query recency.

This matches the timeline in the bug report precisely: "phone" flashes correctly (its fast response wins the race short-term), then reverts to "lap" (the slow, stale response arrives after and overwrites it).

## 4. Verify

The reproduction in step 1 confirms the mechanism directly: reversing the delays (`onInput('lap', 400)` before `onInput('phone', 100)`) reliably reproduces stale-overwrites-fresh, and swapping the delays back (`lap` fast, `phone` slow) makes it disappear — consistent with a pure ordering race, not a logic error in `fetchResults` or `debounce`.

## 5. Minimal Fix

Track which request is the latest one issued, and ignore any response that arrives after a newer request has already been made. This fixes the mechanism (stale responses get ignored) without touching `debounce`, `fetchResults`, or the render logic itself.

```diff
 export function initSearch(inputEl: HTMLInputElement, resultsEl: HTMLUListElement) {
   inputEl.addEventListener('input', debounce(onInput, 250));

+  let latestRequestId = 0;
+
   async function onInput(e: Event) {
     const query = (e.target as HTMLInputElement).value.trim();

     if (!query) {
       resultsEl.innerHTML = '';
+      latestRequestId++; // invalidate any in-flight request too
       return;
     }

-    const results = await fetchResults(query);
+    const requestId = ++latestRequestId;
+    const results = await fetchResults(query);
+    if (requestId !== latestRequestId) return; // a newer request superseded this one; drop it
     renderResults(results);
   }
```

**Why this and not an alternative:**

- An `AbortController` passed into `fetchResults` would be the more "correct" cancellation-based fix, but it requires `fetchResults` to accept and honor a signal — a larger, cross-module change not justified by this bug alone. The request-token check achieves the same outcome (stale responses never render) with a 4-line, single-file diff.
- Clearing the empty-query branch's token too matters: without `latestRequestId++` there, clearing the box and then a slow prior response arriving would repopulate results into an intentionally-emptied list.

## 6. Validate

- Re-ran the reproduction from step 1 with the fix applied: output is now only `rendering: [ 'phone-result' ]` — the stale `lap` response is dropped.
- No existing test suite covers `searchBox.ts`; recommend adding one (see below) since this bug class is exactly what unit tests with controllable delays are good at catching.
- `Grep`'d the codebase for the same pattern (`await fetch\w*\(.*\)` followed directly by a render call with no staleness check): one more instance found in `src/autocomplete.ts:44`, same shape, same risk. Not fixed in this pass — flagging it as a follow-up since it's a separate file/call site.

**Suggested regression test:**

```ts
import { initSearch } from './searchBox';
import * as api from './api';

it('ignores a stale response that resolves after a newer request', async () => {
  const calls = ['lap', 'phone'];
  jest.spyOn(api, 'fetchResults').mockImplementation((q: string) =>
    q === 'lap'
      ? new Promise((r) => setTimeout(() => r(['lap-result']), 50))
      : Promise.resolve(['phone-result'])
  );

  const input = document.createElement('input');
  const list = document.createElement('ul');
  initSearch(input, list);

  input.value = 'lap';
  input.dispatchEvent(new Event('input'));
  await Promise.resolve();
  input.value = 'phone';
  input.dispatchEvent(new Event('input'));

  await new Promise((r) => setTimeout(r, 300));
  expect(list.innerHTML).toContain('phone-result');
  expect(list.innerHTML).not.toContain('lap-result');
});
```

## 7. Report

**Root cause:** `onInput` had no request-ordering guard, so a slower response to an earlier query could resolve after — and overwrite — a faster response to a newer query; the debounce added earlier reduced request *frequency* but never addressed response *ordering*.

**Fix:** Added a monotonically increasing request token; a response is only rendered if no newer request has been issued since it was sent. 4-line diff in `src/searchBox.ts`, no other files touched.

**Verified:** Reproduced the race with a standalone script, confirmed the fix eliminates it, and confirmed reverting the fix reproduces the bug again (isolating the fix as the actual cause of the resolution, not a coincidence).

**Residual risk / follow-up:** `src/autocomplete.ts:44` has the identical unguarded pattern and will exhibit the same bug under similar latency conditions — recommend applying the same fix there in a follow-up change. No regression test currently exists for `searchBox.ts`; one is proposed above and should be added alongside the fix.
