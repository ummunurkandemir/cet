---
name: skill-template
description: <What the skill does, in one sentence.> Use when <the concrete situation that should trigger it>, not for <the nearest neighbor it gets confused with> (see <sibling skill or agent>).
allowed-tools: Read, Grep, Glob
---

<!--
Copy this directory to skills/<your-skill-name>/ and:
  1. Set `name` to the directory name.
  2. Write the description: Claude decides when to use the skill from it.
  3. List only the tools the skill needs. Read-only skills never get Edit/Write.
  4. Replace examples/input.md and examples/output.md with a real worked case.
  5. Add a row to the README's skills table, then run `npm run validate`.
-->

# <Skill Title>

## Purpose

<The outcome this skill produces and the failure mode it exists to prevent. Two to four sentences. Say what "done" looks like.>

## When to Use

Use this skill when:

- <Concrete trigger 1>
- <Concrete trigger 2>

Do **not** use this skill for:

- <Neighboring task>. That's `<sibling>`.
- <A case where the skill would give a confident but wrong answer>

## Inputs

| Input | Required? | Why it matters |
|---|---|---|
| <Input> | Required | <What goes wrong without it> |
| <Input> | Recommended | <...> |

## Instructions

1. **<Gather evidence.>** <Which commands or files, and what to record.>
2. **<Analyze.>** <The decision rule, stated so two runs reach the same answer.>
3. **<Verify.>** <How the result is confirmed by running something, not just by reading.>
4. **Report** <the exact output shape>, and flag every assumption and unknown explicitly.

## Best Practices

- **<Principle.>** <Why it matters here.>

## Limitations

- **<What the skill can't see or do.>** <What the user should do about it.>
