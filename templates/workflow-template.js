// Template for a gated, fail-closed workflow. Copy it to
// workflows/<name>.workflow.js, add it to plugin.json "workflows" and to the
// README's workflows table. Plain JavaScript only, no TypeScript, and no
// Date.now()/Math.random() (they break resume).

export const meta = {
  name: 'workflow-template',
  description: 'One line shown in the permission dialog',
  whenToUse: 'When to pick this workflow over running the pieces by hand',
  phases: [
    { title: 'Check', detail: 'run the gate command' },
    { title: 'Act', detail: 'only if the gate passed' },
  ],
}

// Agents from this plugin are namespaced when installed via /plugin install.
// Pass args.agentNamespace = '' if you copied the agents into .claude/agents.
const NS = args?.agentNamespace ?? 'engineering-toolkit:'

const GATE = {
  type: 'object',
  properties: {
    passed: { type: 'boolean' },
    command: { type: 'string' },
    evidence: { type: 'string', description: 'Last relevant lines of output' },
  },
  required: ['passed', 'command', 'evidence'],
}

// Fail closed: a missing or unparseable result counts as a failure.
function gate(name, result) {
  if (!result || result.passed !== true) {
    log(`${name} failed — stopping`)
    return false
  }
  return true
}

phase('Check')
const check = await agent(
  'Find and run the repository\'s lint command. Report passed=true only if it exited 0. ' +
    'If no lint command can be found, report passed=false and say so in evidence.',
  { schema: GATE, label: 'lint' },
)
if (!gate('Check', check)) return { status: 'blocked', stage: 'Check', check }

phase('Act')
const report = await agent('Review the current branch diff and report findings.', {
  agentType: `${NS}code-reviewer`,
  label: 'review',
})

return { status: 'done', check, report }
