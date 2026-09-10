---
name: postmortem-draft
description: Drafts a blameless incident postmortem from the incident timeline, the fix commit, and the alerting/monitoring record — impact, root cause, contributing factors, detection/response gaps, and concrete action items with owners. Use after an incident is mitigated, not during active response.
allowed-tools: Read, Bash, Grep, Glob
---

# Postmortem Draft

## Purpose

Turn a resolved incident into a document that changes something. Most postmortems fail the same way: they restate the timeline, name "human error" as the root cause, and produce action items like "be more careful" that nobody owns and nothing tracks. This skill drafts one anchored in evidence — commits, logs, alert timestamps — with action items specific enough to close.

The document is a draft for the incident owner to review, not a published postmortem.

## When to Use

Use this skill when:

- An incident is mitigated and a written postmortem is required (or would be useful).
- The `incident-triage` workflow has completed its Patch → Verify stages and reached the postmortem step.
- A near-miss needs writing up — no customer impact, but the failure mode is worth recording.

Do **not** use this skill for:

- Active incident response. During an incident, the priority is mitigation; drafting a document competes with that.
- Root-causing the bug itself — that's `bug-fixer` (and `javascript-debugger` for JS/TS logic). This skill documents a root cause that has already been established, and says so plainly when it hasn't.
- Performance reviews or attributing fault to individuals. This is explicitly blameless; see Best Practices.

## Inputs

| Input | Required? | Why it matters |
|---|---|---|
| Incident timeline (detection, escalation, mitigation, resolution timestamps) | Required | Impact duration and detection/response gaps are computed from it, not estimated |
| The fix — commit, PR, or config change | Required | Grounds the root cause in what actually changed to stop the bleeding |
| Impact data (affected users/requests, error rate, duration, degraded vs. down) | Required | Distinguishes severity from perceived severity; without it the document can't be prioritized against other work |
| The triggering change, if any (deploy, config push, feature flag, traffic shift) | Strongly recommended | Separates the trigger from the root cause — usually two different things |
| Alert/monitoring record (what fired, when, what didn't fire) | Strongly recommended | Detection gaps are the most reliably actionable output of a postmortem |
| Response log (chat transcript, incident channel, runbook used) | Recommended | Shows where response time actually went — often diagnosis, not the fix |
| Org postmortem template | Optional | Match the org's existing structure and severity scale rather than imposing a new one |

## Instructions

1. **Confirm the incident is actually mitigated** before drafting. If response is ongoing, say so and stop — a postmortem written mid-incident anchors on an incomplete picture.
2. **Reconstruct the timeline from evidence.** Use `Bash` (`git log`, `git show`, deploy history) and the supplied logs/alerts to place each event at a real timestamp. Mark any entry that is reconstructed rather than recorded.
3. **State impact quantitatively** — who was affected, how many, how badly, for how long. If the data isn't available, write "unmeasured" and add measuring it as an action item; never estimate a number into a document that will be quoted later.
4. **Separate trigger from root cause.** The deploy that surfaced the bug is the trigger. The root cause is the condition that made that deploy capable of causing an outage — and there is usually more than one contributing factor.
5. **Read the fix commit** and describe what it changed, plus whether it is a mitigation (stopped the symptom) or a real fix (removed the cause). A rollback is a mitigation; the postmortem must say what still needs doing.
6. **Analyze detection and response separately from cause.** Time-to-detect, time-to-escalate, and time-to-mitigate each have their own failure modes: no alert, alert to the wrong team, alert fired and was ignored, runbook missing or wrong.
7. **Derive action items from the gaps you identified**, one per gap, each with a concrete deliverable, an owner (or `OWNER TBD`), and a priority tied to whether it prevents recurrence, speeds detection, or speeds response. Never write an action item that isn't traceable to something in the analysis.
8. **Write it blamelessly.** Describe systems and conditions, not people's decisions in hindsight. "The deploy pipeline allowed a config change to skip staging" — not "X pushed without testing."
9. **Report the draft, flagging every unknown explicitly** so the incident owner can fill gaps rather than unknowingly publish a confident-sounding guess.

## Best Practices

- **Blameless means structural.** Every place you'd name a person, name the system that permitted the outcome. If a mistake was easy to make, the fix is making it hard to make — not asking for more care.
- **"Human error" is never a root cause.** It's the starting point of the analysis, not its conclusion.
- **Action items must be closable.** "Improve monitoring" can't be finished; "add an alert on 5xx rate > 2% over 5m for the checkout service" can.
- **Fewer, real action items beat a long list.** Ten items, eight of which nobody does, is worse than three that ship — it just also destroys trust in the process.
- **Record what went right too.** A fast rollback, a runbook that worked, an alert that fired correctly — these are the practices worth protecting when priorities shift later.
- **Mark reconstructed timeline entries.** A confident-looking timestamp that was inferred will be treated as fact by everyone who reads it afterward.
- **Note whether the fix is permanent.** Incidents "closed" on a rollback with no follow-up are the ones that recur.

## Limitations

- **Only as good as the incident record.** Sparse logs, no alert history, or an undocumented response produce a document full of flagged unknowns — which is the honest output, not a failure.
- **Cannot measure impact it wasn't given.** Business impact (revenue, SLA breach, customer escalations) has to be supplied; it isn't derivable from the repository.
- **Does not verify the root cause.** It documents the cause established by whoever diagnosed the incident and states clearly when that diagnosis was inconclusive.
- **Cannot assign owners.** Action items get `OWNER TBD` until a human assigns them; the draft is not a commitment on anyone's behalf.
- **Not a substitute for the review meeting.** The draft exists to make that discussion faster and evidence-based, not to replace it.
- **Cross-service incidents are only partly visible.** Failures spanning systems outside this repository can only be documented from the context supplied.
