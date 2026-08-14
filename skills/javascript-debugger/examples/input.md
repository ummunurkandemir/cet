# Example Input

This is what a realistic request to the `javascript-debugger` skill looks like — a bug report plus the relevant source, handed over as-is.

---

**Bug report**

> Users occasionally see stale search results in the product search box. Steps to reproduce: type "lap", pause briefly, then quickly change it to "phone". Most of the time the results for "phone" show up correctly, but every so often the list flashes to "phone" results and then reverts to showing "lap" results a moment later — even though the input field clearly says "phone". No error in the console. Doesn't happen every time, which is why it took a while to pin down. Started happening after we added the 250ms debounce to reduce API calls (see `feat: debounce search input` a few weeks back).

**Environment**

- Chrome and Firefox, latest versions
- `fetchResults()` hits an internal REST endpoint; latency is normally ~80–150ms but spikes to 400ms+ under load
- No stack trace — this is a wrong-output bug, not a crash

**Relevant file:** `src/searchBox.ts`

```ts
import { fetchResults } from './api';

export function initSearch(inputEl: HTMLInputElement, resultsEl: HTMLUListElement) {
  inputEl.addEventListener('input', debounce(onInput, 250));

  async function onInput(e: Event) {
    const query = (e.target as HTMLInputElement).value.trim();

    if (!query) {
      resultsEl.innerHTML = '';
      return;
    }

    const results = await fetchResults(query);
    renderResults(results);
  }

  function renderResults(results: string[]) {
    resultsEl.innerHTML = results.map((r) => `<li>${r}</li>`).join('');
  }
}

function debounce<T extends (...args: any[]) => void>(fn: T, delay: number): T {
  let timer: ReturnType<typeof setTimeout>;
  return ((...args: Parameters<T>) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  }) as T;
}
```

**What's already been tried**

- Confirmed the debounce itself fires only once per pause in typing (added a `console.log` in `onInput`, only one call per settled query).
- Confirmed `fetchResults` returns the correct results for the correct query when called directly — the API isn't the problem.
- No `try/catch` anywhere in this path, so it's not a swallowed error.
