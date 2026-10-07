export const meta = {
  name: 'incident-triage',
  description: 'Reproduce a production error, root-cause and patch it with bug-fixer, verify the patch independently, and draft the postmortem. Stops before commit.',
  whenToUse: 'A mitigated or ongoing-but-contained incident has a concrete error (Sentry issue, stack trace, failing request). Pass {issue: "<error, link or description>"}.',
  phases: [
    { title: 'Reproduce', detail: 'failing test or repro command' },
    { title: 'Patch', detail: 'bug-fixer agent' },
    { title: 'Verify', detail: 'repro re-run + code-reviewer in parallel' },
    { title: 'Postmortem', detail: 'postmortem-draft skill' },
  ],
}

// args: { issue: string, agentNamespace?: 'engineering-toolkit:' }
const NS = args?.agentNamespace ?? 'engineering-toolkit:'
const ISSUE = typeof args === 'string' ? args : args?.issue
if (!ISSUE) throw new Error('incident-triage needs args.issue: the error, Sentry link, stack trace or incident description')

const REPRO = {
  type: 'object',
  properties: {
    reproduced: { type: 'boolean' },
    command: { type: 'string', description: 'Command that fails now and should pass after the fix' },
    testFile: { type: 'string', description: 'Path of the failing test added, or empty' },
    evidence: { type: 'string' },
  },
  required: ['reproduced', 'command', 'testFile', 'evidence'],
}
const PATCH = {
  type: 'object',
  properties: {
    rootCause: { type: 'string' },
    fixSummary: { type: 'string' },
    filesChanged: { type: 'array', items: { type: 'string' } },
    isMitigationOnly: { type: 'boolean', description: 'true if this stops the symptom without removing the cause' },
  },
  required: ['rootCause', 'fixSummary', 'filesChanged', 'isMitigationOnly'],
}
const GATE = {
  type: 'object',
  properties: { passed: { type: 'boolean' }, command: { type: 'string' }, evidence: { type: 'string' } },
  required: ['passed', 'command', 'evidence'],
}
const REVIEW = {
  type: 'object',
  properties: {
    verdict: { type: 'string', enum: ['APPROVE', 'APPROVE WITH NOTES', 'REQUEST CHANGES'] },
    blocking: { type: 'array', items: { type: 'string' } },
    report: { type: 'string' },
  },
  required: ['verdict', 'blocking', 'report'],
}

phase('Reproduce')
const repro = await agent(
  `Reproduce this incident locally:\n\n${ISSUE}\n\n` +
    'Prefer a minimal failing automated test placed next to the affected code; otherwise a single command that demonstrates the failure. ' +
    'Run it and confirm it fails for the reported reason (not an unrelated error). Do not fix anything. ' +
    'Report reproduced=false if you could not trigger the reported failure, with what you tried.',
  { schema: REPRO, label: 'reproduce', phase: 'Reproduce' },
)
if (!repro || !repro.reproduced) {
  log('Could not reproduce — stopping. A patch for an unreproduced failure cannot be verified.')
  return { status: 'not-reproduced', repro }
}

phase('Patch')
const patch = await agent(
  `Fix the failure reproduced by \`${repro.command}\` (incident: ${ISSUE}).\nReproduction evidence:\n${repro.evidence}\n\n` +
    'Root-cause it, apply the smallest correct fix, and run the repro plus the related tests. Do not commit.',
  { agentType: `${NS}bug-fixer`, schema: PATCH, label: 'bug-fixer', phase: 'Patch' },
)
if (!patch) return { status: 'patch-failed', repro }

phase('Verify')
const [rerun, review] = await parallel([
  () =>
    agent(
      `Run \`${repro.command}\` and the test files covering ${patch.filesChanged.join(', ')}. Report passed=true only if all exit 0. Do not modify files.`,
      { schema: GATE, label: 'rerun-repro', phase: 'Verify' },
    ),
  () =>
    agent(
      `Review the uncommitted changes in the working tree. They are a hotfix for: ${ISSUE}\nClaimed root cause: ${patch.rootCause}\nCheck the fix addresses that cause rather than masking the symptom.`,
      { agentType: `${NS}code-reviewer`, schema: REVIEW, label: 'code-reviewer', phase: 'Verify' },
    ),
])
const verified = rerun?.passed === true && review && review.verdict !== 'REQUEST CHANGES'
if (!verified) log('Verification failed — the patch is left uncommitted in the working tree for inspection')

phase('Postmortem')
const postmortem = await agent(
  'Use the postmortem-draft skill to draft a blameless postmortem for this incident. Flag every unknown (timeline, impact numbers) explicitly rather than estimating.\n\n' +
    `Incident: ${ISSUE}\nReproduction: ${repro.command}\n${repro.evidence}\n` +
    `Root cause: ${patch.rootCause}\nFix: ${patch.fixSummary} (mitigation only: ${patch.isMitigationOnly})\n` +
    `Verification: ${verified ? 'passed' : 'FAILED'} — ${rerun?.evidence ?? 'no result'}\nReview: ${review?.verdict ?? 'no result'}\n\nReturn the draft markdown.`,
  { label: 'postmortem-draft', phase: 'Postmortem' },
)

log('Stopping before commit — review the patch and the postmortem draft, then commit yourself.')
return { status: verified ? 'patched-awaiting-approval' : 'patch-not-verified', repro, patch, rerun, review, postmortem }
