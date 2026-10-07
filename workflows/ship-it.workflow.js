export const meta = {
  name: 'ship-it',
  description: 'Lint, build, test and review the current branch, then commit and (optionally) open a PR. Halts at the first failing gate.',
  whenToUse: 'A feature branch is ready and you want it gated all the way to a PR. Pass {openPr: true} to commit, push and open the PR; without it the run stops after review with a drafted PR description.',
  phases: [
    { title: 'Lint' },
    { title: 'Build' },
    { title: 'Test' },
    { title: 'Review', detail: 'code-reviewer agent' },
    { title: 'Commit' },
    { title: 'PR', detail: 'only with {openPr: true}' },
  ],
}

// args: { base?: 'main', openPr?: boolean, agentNamespace?: 'engineering-toolkit:' }
const NS = args?.agentNamespace ?? 'engineering-toolkit:'
const BASE = args?.base ?? 'main'
const OPEN_PR = args?.openPr === true

const GATE = {
  type: 'object',
  properties: {
    passed: { type: 'boolean' },
    skipped: { type: 'boolean', description: 'true only if the repo genuinely has no such step' },
    command: { type: 'string' },
    evidence: { type: 'string', description: 'Exit code and the last relevant lines of output' },
  },
  required: ['passed', 'skipped', 'command', 'evidence'],
}

const REVIEW = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['APPROVE', 'APPROVE WITH NOTES', 'REQUEST CHANGES'] },
    summary: { type: 'string' },
    blocking: { type: 'array', items: { type: 'string' } },
    report: { type: 'string', description: 'The full review in the agent\'s standard format' },
  },
  required: ['verdict', 'summary', 'blocking', 'report'],
}

const stages = {}

// Fail closed: null, unparseable or not-passed results all stop the pipeline.
// A stage may report skipped only when the repo has no such command at all;
// that is logged so it is never silent.
async function runGate(title, what) {
  phase(title)
  const r = await agent(
    `Find this repository's ${what} command (package.json scripts, Makefile, CI config, CLAUDE.md) and run it on the current working tree. ` +
      `Report passed=true only if it exited 0. If the repository has no ${what} step at all, report skipped=true and passed=true and name where you looked. ` +
      `If a command exists but you cannot run it (missing dependency, service down), report passed=false. Do not modify any files.`,
    { schema: GATE, label: title.toLowerCase(), phase: title },
  )
  stages[title] = r
  if (!r || r.passed !== true) {
    log(`${title} failed — pipeline halted, nothing committed`)
    return false
  }
  if (r.skipped) log(`${title}: no ${what} step found in this repo — skipped (${r.evidence})`)
  return true
}

if (!(await runGate('Lint', 'lint'))) return { status: 'blocked', stage: 'Lint', stages }
if (!(await runGate('Build', 'build/typecheck'))) return { status: 'blocked', stage: 'Build', stages }
if (!(await runGate('Test', 'test'))) return { status: 'blocked', stage: 'Test', stages }

phase('Review')
const review = await agent(
  `Review the changes on the current branch against ${BASE} (committed and uncommitted). Use your standard output format and fill the structured fields from it.`,
  { agentType: `${NS}code-reviewer`, schema: REVIEW, label: 'code-reviewer', phase: 'Review' },
)
stages.Review = review
if (!review || review.verdict === 'REQUEST CHANGES') {
  log('Review requested changes — pipeline halted, nothing committed')
  return { status: 'blocked', stage: 'Review', stages }
}

const description = await agent(
  `Use the pr-description skill to draft a pull request description for the current branch against ${BASE}. ` +
    `Include the lint/build/test commands that passed: ${JSON.stringify(['Lint', 'Build', 'Test'].map((s) => stages[s].command))}. Return only the description markdown.`,
  { label: 'pr-description', phase: 'Review' },
)

if (!OPEN_PR) {
  log('All gates passed. Run again with {openPr: true} to commit, push and open the PR.')
  return { status: 'ready', stages, prDescription: description }
}

phase('Commit')
const commit = await agent(
  `If the current branch is ${BASE}, create a new branch named after the change first. ` +
    'If there are uncommitted changes, stage the files that belong to this change (never .env or credentials; list anything you left out) and commit them with a message in the repo\'s convention. ' +
    'Report the branch name and the resulting HEAD sha. Do not push.',
  { label: 'commit', phase: 'Commit' },
)
stages.Commit = commit

phase('PR')
const pr = await agent(
  `Push the current branch to origin with upstream tracking and open a pull request against ${BASE} using gh, with this description:\n\n${description}\n\nReturn the PR URL.`,
  { label: 'open-pr', phase: 'PR' },
)
return { status: 'shipped', stages, pr }
