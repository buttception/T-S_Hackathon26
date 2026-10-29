# Replies to Devin's decisions note

**From**: JL. **To**: Devin. **Date**: 2026-10-29. **Answers**: `js/adapt/DECISIONS.md`, "Needs a decision from JL" (A to I).

I read the note and your `predict.js`. Thank you for the standalone function and for making the live policy call the same `pickTarget`: the allocation page now uses it, and a test checks that the page's fallback agrees with it for every seeded trainee in every seat, in both modes.

## Answers

| # | Decision | What it means for you |
|---|---|---|
| A | **Remediation.** Keep the pressure on while the trainee is still missing the target, ease off once they meet it. INTERFACES §6 and PLAN §2 now say so | Make `remediation` the only band rule and the default. Remove `band_mode` from `Adapt.create` options, the **Reasoning tab selector** (`rsnBand` in `runtime.html` and `js/ui-reasoning.js`) and the `challenge` wording in `reasoning.explain`. No `band_mode` field is added to the §3 config. Keep your D2 remediation test; drop or rewrite the challenge-mode ones |
| B | **2400 s.** `duration_s` defaults to 2400 on the allocation page and in the INTERFACES examples | Nothing to change. See the observation below |
| C | **Raise the default envelope.** Done in `fixtures/envelope-default.js`: aggression and sensitivity 0.6 to 2.0 (base 1.0), reaction delay 5 to 60 s (base 30), `weight.ignoredWarning` 0.5 to 2.5, and 1.0-based entries for `weight.cpa`, `weight.proximity`, `weight.territorial`, `weight.contiguous`, `weight.fcRadar` and `weight.slowSpeed`, so every tactic setting in your `TACTICS` can move | Please tell me the runtime defaults of `calm_down_rate` and `detection`; I left them out of the envelope until I know, so the territorial and speed tactics currently skip them |
| D | See "Open" below | |
| E | **Fixed.** §9.1 now uses the real seats (`weapons`, `sensors`, `navigation`). `platform` in the record is the platform **type string**, as you built it | None |
| F | **Navigation seat.** The §3 and §3.1 examples now seat `trainee_b` at navigation. The allocation page's "Suggest demo pair" already does this | None |
| G | **Validators added** in `contracts/contracts.js`: `validateEvent(e, seats?)`, `validateAdjustment(a, {envelope}?)`, `validateSessionRecord(r, {envelope}?)` | Call them in `tests/runtime/` (and in the runtime if you want). I checked them against full sessions from your runtime (adaptive in both band modes, and fixed), 2400 s each with the new envelope: no errors, and fixed mode made zero adjustments |
| H | Resolved earlier | None |
| I | **Process.** I read the note and ran your `predict` through my tests; I have not read your runtime code line by line. Please go back to the lane rule: your own branch, merged through me | Next time use `devin/...` and tell me when it is ready |

## Observation from the validation run (for you to judge)

Running your runtime for 2400 s with the new default envelope and the scripted crew (strong, strong, `weak_hail_discipline` in navigation):

| | Adaptive, default band | Adaptive, remediation | Fixed |
|---|---|---|---|
| Events | 9 | 9 | 7 |
| Hail events | 2 ignored, 2 acknowledged | the same | 1 ignored, 1 acknowledged |
| Adjustments | 24 | 24 | 0 |
| Outcome | `fail` (`exercise_failed` logged) | `fail` | `fail` |

- Only four hail events in 2400 s means the navigation seat reaches `MIN_WINDOW` (3 target events) late, so the two band modes behaved identically: the seat was still in the "probe up" phase. The G1 beat "pressure eases once the trainee starts answering" may not show in a 2400 s run. Options: a longer default, a lower `MIN_WINDOW`, or scripted hails that arrive earlier. Your call; tell me if it needs a different default duration.
- Every run ended with outcome `fail`. Your decision 3 explains that a failure state is logged and makes the outcome `fail` without stopping the run, so this is expected, but a demo whose every run is a "fail" may read badly. Worth a look before the pitch.

## Open

- **D (session record to the host).** `link/pane.js` still sends `ended` with only `outcome` and `text`. The fix you propose (a `record` on `ended`, or a new message in `contracts/link.js`) is in my lane (`link/`). I have not done it; JL to confirm whether to do it next.
- Steering toward a competency with no tactic is rejected (your decision 15). Agreed.
- Competencies: your proposal for `escalation_control` is fine. I would drop `threat_evaluation`, `contact_detection` and `picture_reporting` from `seatFocus` for the demo only if they cause confusing "no evidence" seats; tell me when you want that, and I will change `fixtures/platforms.js` and the contract test together.
