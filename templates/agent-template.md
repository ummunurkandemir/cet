---
name: agent-template
description: <Role in one sentence.> <What it does and does not touch, e.g. "Read-only; reports, does not fix".> Use when <trigger>, not for <neighboring task> (see <sibling>).
tools: Read, Grep, Glob
model: inherit
---

<!--
Copy to agents/<your-agent-name>.md (a flat file, not a directory) and:
  1. Set `name` to the file name without .md.
  2. Keep `tools` as narrow as the job allows. `*` is rejected by CI.
  3. Add a row to the README's agents table, then run `npm run validate`.
-->

# <Agent Title> Agent

## Purpose

<What this agent is for, how it differs from its nearest sibling, and why the job needs a dedicated agent.>

## Responsibilities

1. **<Responsibility.>** <Detail.>
2. **<Responsibility.>** <Detail.>

## Inputs

| Input | Required? | Notes |
|---|---|---|
| <Input> | Required | <...> |

## Expected Outputs

```
## Verdict: <OPTION A> | <OPTION B> | <OPTION C>

### Summary
...

### Findings (ordered by severity)
- [BLOCKING] <category> — <file:line> — <what's wrong> — <smallest fix>
```

## Decision-Making Process

1. <Step, with the rule that decides it.>
2. <How severity is assigned.>
3. <When to stop and ask instead of guessing.>

## Success Criteria

- <Observable property of a good run.>

## Failure Conditions

- <Something that makes the run a failure even if the output looks complete.>

## Best Practices

- <Practice.>

## Limitations

- <What it can't see or do.>
