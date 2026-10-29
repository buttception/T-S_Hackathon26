# Request for Glenda: AI partners in the report and history

**From**: JL. **To**: Glenda (`js/report/`, `js/history/`, `js/ui-report.js`). **Date**: 2026-10-29. **Status**: open. Not urgent: nothing breaks today.

## Background

A crew seat can now be played by an AI partner that copies a trainee's older runs (INTERFACES §3.2). In the session record, a partner's crew entry looks like:

```json
{ "seat": "weapons", "trainee_id": "partner_weapons", "role": "partner", "derived_from": {"trainee_id": "trainee_b"} }
```

The runtime does not play partners yet (Devin, D8), so no real record has one today.

## What the host does for you now

`link/host.js` calls `Report.finishSession(record)` with the partner entries **removed** from `crew` (`hostLink.forReport`). So today a partner never gets a report or history entries of its own, and the report does not mention it. The events caused by a partner seat stay in `record.events`, with `trainee_id` `partner_<seat>`.

## What I would like from the report

1. **List the partner**: "AI partner in the weapons seat, based on trainee_b" in the crew table, so the instructor knows the crew was not all human. This needs the partner entries, so tell me when the report handles them and I stop removing them in `forReport`.
2. **Never create a history entry or a trainee section for a partner id.** `History.append` should refuse an id that starts with `partner_`.
3. **Keep partner events out of the trainee's numbers.** A partner's events must not count towards any trainee's `events_by_competency`.

## Not needed

`History.entries(trainee_id)`, mentioned earlier for partners: `Assess.partnerParams` reads `History.list(trainee_id)` and the per-competency `events_by_competency` counts in each entry's facts, which already exist.
