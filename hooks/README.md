# Hooks

Skills don't trigger themselves on git events. The "Pre-push hook" trigger in the main README means you wire the skill into a hook. This directory has a working example.

## `pre-push`

A git pre-push hook that runs two skills headlessly with `claude -p`, limited to read-only tools:

| Skill | Runs when | Blocks the push when |
|---|---|---|
| [`dependency-audit`](../skills/dependency-audit/SKILL.md) | A manifest or lockfile changed in the pushed range | The push introduces a reachable critical/high vulnerability |
| [`test-impact-selector`](../skills/test-impact-selector/SKILL.md) | Every push with changes | The test selection can't be determined |

Install it in a repository:

```bash
cp hooks/pre-push /path/to/repo/.git/hooks/pre-push
chmod +x /path/to/repo/.git/hooks/pre-push
```

Behavior:

- **Fail-closed.** The push goes through only if the model's final line is exactly `GATE: PASS`. Errors, timeouts and unexpected output all block.
- **Bypass** a single push with `git push --no-verify` or `SKIP_CLAUDE_PREPUSH=1 git push`.
- **No `claude` CLI** on the machine: the hook prints a notice and lets the push through.
- **Namespacing.** It calls `/engineering-toolkit:<skill>` (the plugin install). If you copied the skills into `.claude/skills` instead, set `CLAUDE_TOOLKIT_NS=""`.

Each run makes a model call, so the hook adds latency and cost to every push. Keep it on repositories where that's worth it.
