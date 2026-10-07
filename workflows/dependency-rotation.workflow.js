export const meta = {
  name: 'dependency-rotation',
  description: 'Audit dependencies, upgrade the single highest-priority one, re-verify the full suite, draft the changelog entry, and optionally open a PR.',
  whenToUse: 'Scheduled dependency maintenance, one package per run. Pass {package: "name@version"} to skip target selection, {openPr: true} to commit and open a PR.',
  phases: [
    { title: 'Audit', detail: 'dependency-audit skill' },
    { title: 'Upgrade', detail: 'dependency-upgrader agent' },
    { title: 'Test', detail: 'independent full-suite run' },
    { title: 'Changelog', detail: 'changelog-entry skill' },
    { title: 'PR', detail: 'only with {openPr: true}' },
  ],
}

// args: { package?: 'name@version', openPr?: boolean, base?: 'main', agentNamespace?: 'engineering-toolkit:' }
const NS = args?.agentNamespace ?? 'engineering-toolkit:'
const BASE = args?.base ?? 'main'
const OPEN_PR = args?.openPr === true

const AUDIT = {
  type: 'object',
  properties: {
    candidates: {
      type: 'array',
      description: 'Upgrade candidates, highest priority first',
      items: {
        type: 'object',
        properties: {
          package: { type: 'string' },
          current: { type: 'string' },
          target: { type: 'string' },
          severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'staleness'] },
          reason: { type: 'string' },
        },
        required: ['package', 'current', 'target', 'severity', 'reason'],
      },
    },
  },
  required: ['candidates'],
}
const UPGRADE = {
  type: 'object',
  properties: {
    outcome: { type: 'string', enum: ['UPGRADED', 'REVERTED', 'BLOCKED'] },
    package: { type: 'string' },
    from: { type: 'string' },
    to: { type: 'string' },
    evidence: { type: 'string' },
  },
  required: ['outcome', 'package', 'from', 'to', 'evidence'],
}
const GATE = {
  type: 'object',
  properties: { passed: { type: 'boolean' }, command: { type: 'string' }, evidence: { type: 'string' } },
  required: ['passed', 'command', 'evidence'],
}

let target
phase('Audit')
if (args?.package) {
  target = { package: args.package, reason: 'requested explicitly' }
  log(`Using requested package ${args.package}; audit skipped`)
} else {
  const audit = await agent(
    'Use the dependency-audit skill on this repository. Return upgrade candidates ordered by real risk (reachable vulnerabilities first, then staleness). ' +
      'Prefer the smallest safe target version for each. Do not modify any files.',
    { schema: AUDIT, label: 'dependency-audit', phase: 'Audit' },
  )
  if (!audit) return { status: 'blocked', stage: 'Audit' }
  if (!audit.candidates.length) return { status: 'nothing-to-do', audit }
  target = audit.candidates[0]
  const rest = audit.candidates.length - 1
  if (rest) log(`One package per run: upgrading ${target.package}; ${rest} other candidate(s) left for later runs`)
}

phase('Upgrade')
const upgrade = await agent(
  `Upgrade ${target.package}${target.target ? ` to ${target.target}` : ''} (reason: ${target.reason}). ` +
    'Run the test suite and revert exactly to the starting state if it fails. Do not commit.',
  { agentType: `${NS}dependency-upgrader`, schema: UPGRADE, label: 'dependency-upgrader', phase: 'Upgrade' },
)
if (!upgrade || upgrade.outcome !== 'UPGRADED') {
  log(`Upgrade ${upgrade?.outcome ?? 'did not complete'} — stopping`)
  return { status: 'not-upgraded', target, upgrade }
}

phase('Test')
const test = await agent(
  "Run this repository's full test suite (not a subset) and its build/typecheck. Report passed=true only if everything exits 0. Do not modify files.",
  { schema: GATE, label: 'full-suite', phase: 'Test' },
)
if (!test || !test.passed) {
  log('Independent full-suite run failed after the upgrade — the change is left uncommitted for inspection')
  return { status: 'blocked', stage: 'Test', target, upgrade, test }
}

phase('Changelog')
const changelog = await agent(
  `Use the changelog-entry skill to add a CHANGELOG.md entry for upgrading ${upgrade.package} from ${upgrade.from} to ${upgrade.to}. ` +
    `Context: ${target.reason}. If the repository has no CHANGELOG.md, do not create one; return the entry text instead.`,
  { label: 'changelog-entry', phase: 'Changelog' },
)

if (!OPEN_PR) return { status: 'upgraded-uncommitted', target, upgrade, test, changelog }

phase('PR')
const pr = await agent(
  `Create a branch named deps/${upgrade.package.replace(/[^\w.-]/g, '-')}-${upgrade.to}, commit the manifest, lockfile and changelog changes ` +
    `with a message in the repo's convention, push it, and open a pull request against ${BASE} with gh. ` +
    `The PR body should state the reason (${target.reason}), the version change, and the test command that passed (${test.command}). Return the PR URL.`,
  { label: 'open-pr', phase: 'PR' },
)
return { status: 'pr-opened', target, upgrade, test, changelog, pr }
